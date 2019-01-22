/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isString } from 'lodash';
import { promisify } from 'util';
import { CloudService } from './cloud_service';
import { CloudServiceResponse } from './cloud_response';
import { CLOUD_METADATA_SERVICES } from '../../common/constants';

/**
 * {@code GCPCloudService} will check and load the service metadata for an Google Cloud Platform VM if it is available.
 */
class GCPCloudService extends CloudService {

  constructor(options = { }) {
    super('gcp', options);
  }

  _checkIfService(request) {
    // we need to call GCP individually for each field
    const fields = [ 'id', 'machine-type', 'zone' ];

    const create = this._createRequestForField;
    const allRequests = fields.map(field => promisify(request)(create(field)));
    return Promise.all(allRequests)
    /*
      Note: there is no fallback option for GCP;
      responses are arrays containing [fullResponse, body];
      because GCP returns plaintext, we have no way of validating without using the response code
     */
      .then(responses => {
        return responses.map(response => {
          return this._extractBody(response, response.body);
        });
      })
      .then(([id, machineType, zone]) => this._combineResponses(id, machineType, zone));
  }

  _createRequestForField(field) {
    return {
      method: 'GET',
      uri: `${CLOUD_METADATA_SERVICES.GCP_URL_PREFIX}/${field}`,
      headers: {
        // GCP requires this header
        'Metadata-Flavor': 'Google'
      },
      // GCP does _not_ return JSON
      json: false
    };
  }

  /**
   * Extract the body if the response is valid and it came from GCP.
   *
   * @param {Object} response The response object
   * @param {Object} body The response body, if any
   * @return {Object} {@code body} (probably actually a String) if the response came from GCP. Otherwise {@code null}.
   */
  _extractBody(response, body) {
    if (response && response.statusCode === 200 && response.headers && response.headers['metadata-flavor'] === 'Google') {
      return body;
    }

    return null;
  }

  /**
   * Parse the GCP responses, if possible. Example values for each parameter:
   *
   * {@code vmId}: '5702733457649812345'
   * {@code machineType}: 'projects/441331612345/machineTypes/f1-micro'
   * {@code zone}: 'projects/441331612345/zones/us-east4-c'
   *
   * @param {String} vmId The ID of the VM
   * @param {String} machineType The machine type, prefixed by unwanted account info.
   * @param {String} zone The zone (e.g., availability zone), implicitly showing the region, prefixed by unwanted account info.
   * @return {CloudServiceResponse} Never {@code null}.
   * @throws {Error} if the responses do not make a valid response
   */
  _combineResponses(id, machineType, zone) {
    const vmId = isString(id) ? id.trim() : null;
    const vmType = this._extractValue('machineTypes/', machineType);
    const vmZone = this._extractValue('zones/', zone);

    let region;

    if (vmZone) {
      // converts 'us-east4-c' into 'us-east4'
      region = vmZone.substring(0, vmZone.lastIndexOf('-'));
    }

    // ensure we actually have some data
    if (vmId || vmType || region || vmZone) {
      return new CloudServiceResponse(this._name, true, { id: vmId, vmType, region, zone: vmZone });
    }

    throw new Error('unrecognized responses');
  }

  /**
   * Extract the useful information returned from GCP while discarding unwanted account details (the project ID). For example,
   * this turns something like 'projects/441331612345/machineTypes/f1-micro' into 'f1-micro'.
   *
   * @param {String} fieldPrefix The value prefixing the actual value of interest.
   * @param {String} value The entire value returned from GCP.
   * @return {String} {@code undefined} if the value could not be extracted. Otherwise just the desired value.
   */
  _extractValue(fieldPrefix, value) {
    if (isString(value)) {
      const index = value.lastIndexOf(fieldPrefix);

      if (index !== -1) {
        return value.substring(index + fieldPrefix.length).trim();
      }
    }

    return undefined;
  }

}

/**
 * Singleton instance of {@code GCPCloudService}.
 *
 * @type {GCPCloudService}
 */
export const GCP = new GCPCloudService();
