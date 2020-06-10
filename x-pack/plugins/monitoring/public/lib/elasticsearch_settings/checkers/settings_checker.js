/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class SettingsChecker {
  constructor($http) {
    this.$http = $http;

    this.message = null;
    this.api = null;
    this.next = null;
  }

  setApi(api) {
    this.api = api;
  }

  setMessage(message) {
    this.message = message;
  }

  getApi() {
    return this.api;
  }

  getMessage() {
    return this.message;
  }

  hasNext() {
    return this.next !== null;
  }

  setNext(checker) {
    this.next = checker;
  }

  getNext() {
    return this.next;
  }

  async executeCheck() {
    try {
      const { data } = await this.$http.get(this.getApi());
      const { found, reason } = data;

      return { found, reason };
    } catch (err) {
      const { data } = err;

      return {
        error: true,
        found: false,
        errorReason: data,
      };
    }
  }
}
