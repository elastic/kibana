/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, omit } from 'lodash';
import { promisify } from 'util';
import { CloudService } from './cloud_service';
import { CloudServiceResponse } from './cloud_response';
import { CLOUD_METADATA_SERVICES } from '../../common/constants';

/**
 * {@code AzureCloudService} will check and load the service metadata for an Azure VM if it is available.
 */
class AzureCloudService extends CloudService {

  constructor(options = { }) {
    super('azure', options);
  }

  _checkIfService(request) {
    const req = {
      method: 'GET',
      uri: CLOUD_METADATA_SERVICES.AZURE_URL,
      headers: {
        // Azure requires this header
        'Metadata': 'true'
      },
      json: true
    };

    return promisify(request)(req)
    // Note: there is no fallback option for Azure
      .then(response => {
        return this._parseResponse(response.body, (body) => this._parseBody(body));
      });
  }

  /**
   * Parse the Azure response, if possible. Example payload (with network object ignored):
   *
   * {
   *   "compute": {
   *     "location": "eastus",
   *     "name": "my-ubuntu-vm",
   *     "offer": "UbuntuServer",
   *     "osType": "Linux",
   *     "platformFaultDomain": "0",
   *     "platformUpdateDomain": "0",
   *     "publisher": "Canonical",
   *     "sku": "16.04-LTS",
   *     "version": "16.04.201706191",
   *     "vmId": "d4c57456-2b3b-437a-9f1f-7082cfce02d4",
   *     "vmSize": "Standard_A1"
   *   },
   *   "network": {
   *     ...
   *   }
   * }
   *
   * Note: Azure VMs created using the "classic" method, as opposed to the resource manager,
   * do not provide a "compute" field / object. However, both report the "network" field / object.
   *
   * @param {Object} body The response from the VM web service.
   * @return {CloudServiceResponse} {@code null} for default fallback.
   */
  _parseBody(body) {
    const compute = get(body, 'compute');
    const id = get(compute, 'vmId');
    const vmType = get(compute, 'vmSize');
    const region = get(compute, 'location');

    // remove keys that we already have; explicitly undefined so we don't send it when empty
    const metadata = compute ? omit(compute, [ 'vmId', 'vmSize', 'location' ]) : undefined;

    // we don't actually use network, but we check for its existence to see if this is a response from Azure
    const network = get(body, 'network');

    // ensure we actually have some data
    if (id || vmType || region) {
      return new CloudServiceResponse(this._name, true, { id, vmType, region, metadata });
    } else if (network) {
      // classic-managed VMs in Azure don't provide compute so we highlight the lack of info
      return new CloudServiceResponse(this._name, true, { metadata: { classic: true } });
    }

    return null;
  }

}

/**
 * Singleton instance of {@code AzureCloudService}.
 *
 * @type {AzureCloudService}
 */
export const AZURE = new AzureCloudService();
