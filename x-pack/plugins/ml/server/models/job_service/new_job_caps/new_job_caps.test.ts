/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { newJobCapsProvider } from '.';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import farequoteFieldCaps from './__mocks__/responses/farequote_field_caps.json';
import cloudwatchFieldCaps from './__mocks__/responses/cloudwatch_field_caps.json';
import rollupCaps from './__mocks__/responses/rollup_caps.json';
import dataView from './__mocks__/responses/data_view_rollup_cloudwatch.json';

import farequoteJobCaps from './__mocks__/results/farequote_job_caps.json';
import farequoteJobCapsEmpty from './__mocks__/results/farequote_job_caps_empty.json';
import cloudwatchJobCaps from './__mocks__/results/cloudwatch_rollup_job_caps.json';

describe('job_service - job_caps', () => {
  let mlClusterClientNonRollupMock: any;
  let mlClusterClientRollupMock: any;
  let dataViews: any;

  beforeEach(() => {
    const asNonRollupMock = elasticsearchServiceMock.createElasticsearchClient();
    asNonRollupMock.fieldCaps.mockResponse(farequoteFieldCaps);

    mlClusterClientNonRollupMock = {
      asCurrentUser: asNonRollupMock,
      asInternalUser: asNonRollupMock,
    };

    const callAsRollupMock = elasticsearchServiceMock.createElasticsearchClient();
    callAsRollupMock.fieldCaps.mockResponse(cloudwatchFieldCaps);
    // @ts-expect-error incomplete type type
    callAsRollupMock.rollup.getRollupIndexCaps.mockResponse(rollupCaps);

    mlClusterClientRollupMock = {
      asCurrentUser: callAsRollupMock,
      asInternalUser: callAsRollupMock,
    };

    dataViews = {
      async find() {
        return Promise.resolve(dataView);
      },
    };
  });

  describe('farequote newJobCaps()', () => {
    it('can get job caps for index pattern', async () => {
      const indexPattern = 'farequote-*';
      const isRollup = false;
      const { newJobCaps } = newJobCapsProvider(mlClusterClientNonRollupMock);
      const response = await newJobCaps(indexPattern, isRollup, dataViews);
      expect(response).toEqual(farequoteJobCaps);
    });

    it('can get rollup job caps for non rollup index pattern', async () => {
      const indexPattern = 'farequote-*';
      const isRollup = true;
      const { newJobCaps } = newJobCapsProvider(mlClusterClientNonRollupMock);
      const response = await newJobCaps(indexPattern, isRollup, dataViews);
      expect(response).toEqual(farequoteJobCapsEmpty);
    });
  });

  describe('cloudwatch newJobCaps()', () => {
    it('can get rollup job caps for rollup index pattern', async () => {
      const indexPattern = 'cloud_roll_index';
      const isRollup = true;
      const { newJobCaps } = newJobCapsProvider(mlClusterClientRollupMock);
      const response = await newJobCaps(indexPattern, isRollup, dataViews);
      expect(response).toEqual(cloudwatchJobCaps);
    });

    it('can get non rollup job caps for rollup index pattern', async () => {
      const indexPattern = 'cloud_roll_index';
      const isRollup = false;
      const { newJobCaps } = newJobCapsProvider(mlClusterClientRollupMock);
      const response = await newJobCaps(indexPattern, isRollup, dataViews);
      expect(response).not.toEqual(cloudwatchJobCaps);
    });
  });
});
