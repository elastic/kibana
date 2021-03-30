/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { SampleSearchResponse } from '../types';

interface SampleResponseValues {
  query: string;
  response?: SampleSearchResponse;
  isLoading: boolean;
}

interface SampleResponseActions {
  queryChanged: (query: string) => { query: string };
  getSearchResultsSuccess: (response: SampleSearchResponse) => { response: SampleSearchResponse };
  getSearchResultsFailure: () => void;
}

export const SampleResponseLogic = kea<MakeLogicType<SampleResponseValues, SampleResponseActions>>({
  path: ['enterprise_search', 'app_search', 'sample_response_logic'],
  actions: {
    queryChanged: (query) => ({ query }),
    getSearchResultsSuccess: (response) => ({ response }),
    getSearchResultsFailure: true,
  },
  reducers: {
    query: ['', { queryChanged: (_, { query }) => query }],
    response: [null, { getSearchResultsSuccess: (_, { response }) => response }],
    isLoading: [
      false,
      {
        queryChanged: () => true,
        getSearchResultsSuccess: () => false,
        getSearchResultsFailure: () => false,
      },
    ],
  },
  listeners: ({ actions }) => ({
    queryChanged: async () => {
      try {
        const response = await Promise.resolve({
          visitors: {
            raw: 776218,
          },
          nps_image_url: {
            raw:
              'https://www.nps.gov/common/uploads/banner_image/imr/homepage/9E7FC0DB-1DD8-B71B-0BC3880DC2250415.jpg',
          },
          square_km: {
            raw: 1366.2,
          },
          world_heritage_site: {
            raw: 'false',
          },
          date_established: {
            raw: '1964-09-12T05:00:00+00:00',
          },
          image_url: {
            raw:
              'https://storage.googleapis.com/public-demo-assets.swiftype.info/swiftype-dot-com-search-ui-national-parks-demo/9E7FC0DB-1DD8-B71B-0BC3880DC2250415.jpg',
          },
          description: {
            raw:
              'This landscape was eroded into a maze of canyons, buttes, and mesas by the combined efforts of the Colorado River, Green River, and their tributaries, which divide the park into three districts. The park also contains rock pinnacles and arches, as well as artifacts from Ancient Pueblo peoples.',
          },
          location: {
            raw: '38.2,-109.93',
          },
          acres: {
            raw: '337597.83',
          },
          title: {
            raw: 'Canyonlands',
          },
          nps_link: {
            raw: 'https://www.nps.gov/cany/index.htm',
          },
          states: {
            raw: ['Utah'],
          },
          id: {
            raw: 'park_canyonlands',
          },
        });
        actions.getSearchResultsSuccess(response as SampleSearchResponse);
      } catch (error) {
        actions.getSearchResultsFailure();
      }
    },
  }),
});
