/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../__mocks__';

import { nextTick } from '@kbn/test/jest';

import { SampleResponseLogic } from './sample_response_logic';

describe('SampleResponseLogic', () => {
  const { mount } = new LogicMounter(SampleResponseLogic);

  const DEFAULT_VALUES = {
    query: '',
    response: null,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(SampleResponseLogic.values).toEqual({
      ...DEFAULT_VALUES,
    });
  });

  describe('actions', () => {
    describe('queryChanged', () => {
      it('updates query and sets isLoading to true', () => {
        mount({
          query: {},
          isLoading: false,
        });

        SampleResponseLogic.actions.queryChanged('foo');

        expect(SampleResponseLogic.values).toEqual({
          ...DEFAULT_VALUES,
          query: 'foo',
          isLoading: true,
        });
      });
    });

    describe('getSearchResultsSuccess', () => {
      it('sets the response from a search API request and sets isLoading to false', () => {
        mount({
          response: null,
          isLoading: true,
        });

        SampleResponseLogic.actions.getSearchResultsSuccess({});

        expect(SampleResponseLogic.values).toEqual({
          ...DEFAULT_VALUES,
          response: {},
          isLoading: false,
        });
      });
    });

    describe('getSearchResultsFailure', () => {
      it('sets isLoading to false', () => {
        mount({
          isLoading: true,
        });

        SampleResponseLogic.actions.getSearchResultsFailure();

        expect(SampleResponseLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isLoading: false,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('queryChanged', () => {
      // TODO it('makes an API request')

      it('calls getSearchResultsSuccess with the result of the response from the search API request', async () => {
        mount();
        jest.spyOn(SampleResponseLogic.actions, 'getSearchResultsSuccess');

        SampleResponseLogic.actions.queryChanged('foo');
        await nextTick();

        expect(SampleResponseLogic.actions.getSearchResultsSuccess).toHaveBeenCalledWith({
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
      });

      // TODO it('handles errors')
    });
  });
});
