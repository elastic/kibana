/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, omit } from 'lodash';
import { promisify } from 'util';
import { CloudService, Request } from './cloud_service';
import { CloudServiceResponse } from './cloud_response';

// 2017-04-02 is the first GA release of this API
const SERVICE_ENDPOINT = 'http://169.254.169.254/metadata/instance?api-version=2017-04-02';

interface AzureResponse {
  compute?: Record<string, string>;
  network: unknown;
}

/**
 * Checks and loads the service metadata for an Azure VM if it is available.
 */
class AzureCloudService extends CloudService {
  constructor(options = {}) {
    super('azure', options);
  }

  _checkIfService(request?: Request) {
    if (!request) {
      return Promise.reject(new Error('not implemented'));
    }

    const req = {
      method: 'GET',
      uri: SERVICE_ENDPOINT,
      headers: {
        // Azure requires this header
        Metadata: 'true',
      },
      json: true,
    };

    return (
      promisify(request)(req)
        // Note: there is no fallback option for Azure
        .then((response) => {
          if (!response || response.statusCode === 404) {
            throw new Error('Azure request failed');
          }
          return this._parseResponse(response.body, (body) => this._parseBody(body));
        })
    );
  }

  /**
   * Parse the Azure response, if possible.
   *
   * Azure VMs created using the "classic" method, as opposed to the resource manager,
   * do not provide a "compute" field / object. However, both report the "network" field / object.
   *
   * Example payload (with network object ignored):
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
   */
  _parseBody(body: AzureResponse): CloudServiceResponse | null {
    const compute = get(body, 'compute') as Record<string, string>;
    const id: string = get(compute, 'vmId');
    const vmType: string = get(compute, 'vmSize');
    const region: string = get(compute, 'location');

    // remove keys that we already have; explicitly undefined so we don't send it when empty
    const metadata = compute ? omit(compute, ['vmId', 'vmSize', 'location']) : undefined;

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
 * Singleton instance of AzureCloudService.
 */
export const AZURE = new AzureCloudService();
