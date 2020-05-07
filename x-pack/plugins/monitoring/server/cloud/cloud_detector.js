/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CLOUD_SERVICES } from './cloud_services';

/**
 * {@code CloudDetector} can be used to asynchronously detect the cloud service that Kibana is running within.
 */
export class CloudDetector {
  constructor(options = {}) {
    const { cloudServices = CLOUD_SERVICES } = options;

    this._cloudServices = cloudServices;
    // Explicitly undefined. If the value is never updated, then the property will be dropped when the data is serialized.
    this._cloudDetails = undefined;
  }

  /**
   * Get any cloud details that we have detected.
   *
   * @return {Object} {@code undefined} if unknown. Otherwise plain JSON.
   */
  getCloudDetails() {
    return this._cloudDetails;
  }

  /**
   * Asynchronously detect the cloud service.
   *
   * Callers are _not_ expected to {@code await} this method, which allows the caller to trigger the lookup and then simply use it
   * whenever we determine it.
   */
  async detectCloudService() {
    this._cloudDetails = await this._getCloudService(this._cloudServices);
  }

  /**
   * Check every cloud service until the first one reports success from detection.
   *
   * @param {Array} cloudServices The {@code CloudService} objects listed in priority order
   * @return {Promise} {@code undefined} if none match. Otherwise the plain JSON {@code Object} from the {@code CloudServiceResponse}.
   */
  async _getCloudService(cloudServices) {
    // check each service until we find one that is confirmed to match; order is assumed to matter
    for (const service of cloudServices) {
      try {
        const serviceResponse = await service.checkIfService();

        if (serviceResponse.isConfirmed()) {
          return serviceResponse.toJSON();
        }
      } catch (ignoredError) {
        // ignored until we make wider use of this in the UI
      }
    }

    // explicitly undefined rather than null so that it can be ignored in JSON
    return undefined;
  }
}
