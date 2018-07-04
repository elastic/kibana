/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import Boom from 'boom';

export class FilterManager {

  constructor(callWithRequest) {
    this.callWithRequest = callWithRequest;
  }

  async getFilter(filterId) {
    try {
      const resp = await this.callWithRequest('ml.filters', { filterId });
      const filters = resp.filters;
      if (filters.length) {
        return filters[0];
      } else {
        return Boom.notFound(`Filter with the id "${filterId}" not found`);
      }
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async getAllFilters() {
    try {
      const filtersResp = await this.callWithRequest('ml.filters');
      return filtersResp.filters;
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async newFilter(filter) {
    const filterId = filter.filterId;
    delete filter.filterId;
    try {
      await this.callWithRequest('ml.addFilter', { filterId, body: filter });

      // Return the newly created filter.
      return await this.getFilter(filterId);
    } catch (error) {
      return Boom.badRequest(error);
    }
  }

  async updateFilter(filterId,
    description,
    addItems,
    deleteItems) {
    try {
      await this.callWithRequest('ml.updateFilter', {
        filterId,
        body: {
          description,
          add_items: addItems,
          delete_items: deleteItems
        }
      });

      // Return the newly updated filter.
      return await this.getFilter(filterId);
    } catch (error) {
      return Boom.badRequest(error);
    }
  }


  async deleteFilter(filterId) {
    return this.callWithRequest('ml.deleteFilter', { filterId });
  }

}
