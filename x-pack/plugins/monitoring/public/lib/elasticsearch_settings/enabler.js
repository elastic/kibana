/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Class for an object with a bool property to indicate if enabling is actively working,
 * and a method to call the HTTP endpoint to enable a setting
 */
export class Enabler {
  constructor($http, updateModel) {
    this.$http = $http;
    this.updateModel = updateModel;
    this.enableCollectionEnabled = this.enableCollectionEnabled.bind(this); // will be called from event handler callback
    this.enableCollectionInterval = this.enableCollectionInterval.bind(this); // will be called from event handler callback
  }

  async enableCollectionInterval() {
    try {
      this.updateModel({ isCollectionIntervalUpdating: true });
      await this.$http.put('../api/monitoring/v1/elasticsearch_settings/set/collection_interval');
      this.updateModel({
        isCollectionIntervalUpdated: true,
        isCollectionIntervalUpdating: false,
      });
    } catch (err) {
      this.updateModel({
        errors: err.data,
        isCollectionIntervalUpdated: false,
        isCollectionIntervalUpdating: false,
      });
    }
  }

  async enableCollectionEnabled() {
    try {
      this.updateModel({ isCollectionEnabledUpdating: true });
      await this.$http.put('../api/monitoring/v1/elasticsearch_settings/set/collection_enabled');
      this.updateModel({
        isCollectionEnabledUpdated: true,
        isCollectionEnabledUpdating: false,
      });
    } catch (err) {
      this.updateModel({
        errors: err.data,
        isCollectionEnabledUpdated: false,
        isCollectionEnabledUpdating: false,
      });
    }
  }
}
