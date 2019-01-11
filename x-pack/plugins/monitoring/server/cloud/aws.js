/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isString, omit } from 'lodash';
import { promisify } from 'util';
import { CloudService } from './cloud_service';
import { CloudServiceResponse } from './cloud_response';
import fs from 'fs';
import { CLOUD_METADATA_SERVICES } from '../../common/constants';

/**
 * {@code AWSCloudService} will check and load the service metadata for an Amazon Web Service VM if it is available.
 *
 * This is exported for testing purposes. Use the {@code AWS} singleton.
 */
export class AWSCloudService extends CloudService {

  constructor(options = { }) {
    super('aws', options);

    // Allow the file system handler to be swapped out for tests
    const {
      _fs = fs,
      _isWindows = process.platform.startsWith('win')
    } = options;

    this._fs = _fs;
    this._isWindows = _isWindows;
  }

  _checkIfService(request) {
    const req = {
      method: 'GET',
      uri: CLOUD_METADATA_SERVICES.AWS_URL,
      json: true
    };

    return promisify(request)(req)
      .then(response => this._parseResponse(response.body, (body) => this._parseBody(body)))
    // fall back to file detection
      .catch(() => this._tryToDetectUuid());
  }

  /**
   * Parse the AWS response, if possible. Example payload (with fake accountId value):
   *
   * {
   *   "devpayProductCodes" : null,
   *   "privateIp" : "10.0.0.38",
   *   "availabilityZone" : "us-west-2c",
   *   "version" : "2010-08-31",
   *   "instanceId" : "i-0c7a5b7590a4d811c",
   *   "billingProducts" : null,
   *   "instanceType" : "t2.micro",
   *   "imageId" : "ami-6df1e514",
   *   "accountId" : "1234567890",
   *   "architecture" : "x86_64",
   *   "kernelId" : null,
   *   "ramdiskId" : null,
   *   "pendingTime" : "2017-07-06T02:09:12Z",
   *   "region" : "us-west-2"
   * }
   *
   * @param {Object} body The response from the VM web service.
   * @return {CloudServiceResponse} {@code null} if not confirmed. Otherwise the response.
   */
  _parseBody(body) {
    const id = get(body, 'instanceId');
    const vmType = get(body, 'instanceType');
    const region = get(body, 'region');
    const zone = get(body, 'availabilityZone');
    const metadata = omit(body, [
      // remove keys we already have
      'instanceId', 'instanceType', 'region', 'availabilityZone',
      // remove keys that give too much detail
      'accountId', 'billingProducts', 'devpayProductCodes', 'privateIp'
    ]);

    // ensure we actually have some data
    if (id || vmType || region || zone) {
      return new CloudServiceResponse(this._name, true,  { id, vmType, region, zone, metadata });
    }

    return null;
  }

  /**
   * Attempt to load the UUID by checking `/sys/hypervisor/uuid`. This is a fallback option if the metadata service is
   * unavailable for some reason.
   *
   * @return {Promise} Never {@code null} {@code CloudServiceResponse}.
   */
  _tryToDetectUuid() {
    // Windows does not have an easy way to check
    if (!this._isWindows) {
      return promisify(this._fs.readFile)('/sys/hypervisor/uuid', 'utf8')
        .then(uuid => {
          if (isString(uuid)) {
          // Some AWS APIs return it lowercase (like the file did in testing), while others return it uppercase
            uuid = uuid.trim().toLowerCase();

            if (uuid.startsWith('ec2')) {
              return new CloudServiceResponse(this._name, true, { id: uuid });
            }
          }

          return this._createUnconfirmedResponse();
        });
    }

    return Promise.resolve(this._createUnconfirmedResponse());
  }

}

/**
 * Singleton instance of {@code AWSCloudService}.
 *
 * @type {AWSCloudService}
 */
export const AWS = new AWSCloudService();
