/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * {@code CloudServiceResponse} represents a single response from any individual {@code CloudService}.
 */
export class CloudServiceResponse {
  /**
   * Create an unconfirmed {@code CloudServiceResponse} by the {@code name}.
   *
   * @param {String} name The name of the {@code CloudService}.
   * @return {CloudServiceResponse} Never {@code null}.
   */
  static unconfirmed(name) {
    return new CloudServiceResponse(name, false, {});
  }

  /**
   * Create a new {@code CloudServiceResponse}.
   *
   * @param {String} name The name of the {@code CloudService}.
   * @param {Boolean} confirmed Confirmed to be the current {@code CloudService}.
   * @param {String} id The optional ID of the VM (depends on the cloud service).
   * @param {String} vmType The optional type of VM (depends on the cloud service).
   * @param {String} region The optional region of the VM (depends on the cloud service).
   * @param {String} availabilityZone The optional availability zone within the region (depends on the cloud service).
   * @param {Object} metadata The optional metadata associated with the VM.
   */
  constructor(name, confirmed, { id, vmType, region, zone, metadata }) {
    this._name = name;
    this._confirmed = confirmed;
    this._id = id;
    this._metadata = metadata;
    this._region = region;
    this._vmType = vmType;
    this._zone = zone;
  }

  /**
   * Get the name of the {@code CloudService} associated with the current response.
   *
   * @return {String} The cloud service that created this response.
   */
  getName() {
    return this._name;
  }

  /**
   * Determine if the Cloud Service is confirmed to exist.
   *
   * @return {Boolean} {@code true} to indicate that Kibana is running in this cloud environment.
   */
  isConfirmed() {
    return this._confirmed;
  }

  /**
   * Create a plain JSON object that can be indexed that represents the response.
   *
   * @return {Object} Never {@code null} object.
   * @throws {Error} if this response is not {@code confirmed}.
   */
  toJSON() {
    if (!this._confirmed) {
      throw new Error(`[${this._name}] is not confirmed`);
    }

    return {
      name: this._name,
      id: this._id,
      vm_type: this._vmType,
      region: this._region,
      zone: this._zone,
      metadata: this._metadata,
    };
  }
}
