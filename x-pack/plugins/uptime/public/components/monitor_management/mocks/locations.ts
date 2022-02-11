/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const mockLocation = {
  label: 'US Central',
  id: 'us_central',
  geo: {
    lat: 1,
    lon: 1,
  },
  url: 'url',
};

export const mockLocationsState = {
  monitorManagementList: {
    locations: [mockLocation],
    list: {
      monitors: [],
      perPage: 10,
      page: 1,
      total: 0,
    },
    error: {
      serviceLocations: null,
      monitorList: null,
    },
    loading: {
      serviceLocations: false,
      monitorList: false,
    },
  },
};
