/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { newJobCapsProvider } from './index';

import farequoteFieldCaps from './__mocks__/responses/farequote_field_caps.json';
import cloudwatchFieldCaps from './__mocks__/responses/cloudwatch_field_caps.json';
import rollupCaps from './__mocks__/responses/rollup_caps.json';
import kibanaSavedObjects from './__mocks__/responses/kibana_saved_objects.json';

import farequoteJobCaps from './__mocks__/results/farequote_job_caps.json';
import farequoteJobCapsEmpty from './__mocks__/results/farequote_job_caps_empty.json';
import cloudwatchJobCaps from './__mocks__/results/cloudwatch_rollup_job_caps.json';

describe('job_service - job_caps', () => {
  let mlClusterClientNonRollupMock: any;
  let mlClusterClientRollupMock: any;
  let savedObjectsClientMock: any;

  beforeEach(() => {
    const asNonRollupMock = {
      fieldCaps: jest.fn(() => ({ body: farequoteFieldCaps })),
    };

    mlClusterClientNonRollupMock = {
      asCurrentUser: asNonRollupMock,
      asInternalUser: asNonRollupMock,
    };

    const callAsRollupMock = {
      fieldCaps: jest.fn(() => ({ body: cloudwatchFieldCaps })),
      rollup: { getRollupIndexCaps: jest.fn(() => Promise.resolve({ body: rollupCaps })) },
    };

    mlClusterClientRollupMock = {
      asCurrentUser: callAsRollupMock,
      asInternalUser: callAsRollupMock,
    };

    savedObjectsClientMock = {
      async find() {
        return Promise.resolve(kibanaSavedObjects);
      },
    };
  });

  describe('farequote newJobCaps()', () => {
    it('can get job caps for index pattern', async () => {
      const indexPattern = 'farequote-*';
      const isRollup = false;
      const { newJobCaps } = newJobCapsProvider(mlClusterClientNonRollupMock);
      const response = await newJobCaps(indexPattern, isRollup, savedObjectsClientMock);
      expect(response).toEqual(farequoteJobCaps);
    });

    it('can get rollup job caps for non rollup index pattern', async () => {
      const indexPattern = 'farequote-*';
      const isRollup = true;
      const { newJobCaps } = newJobCapsProvider(mlClusterClientNonRollupMock);
      const response = await newJobCaps(indexPattern, isRollup, savedObjectsClientMock);
      expect(response).toEqual(farequoteJobCapsEmpty);
    });
  });

  describe('cloudwatch newJobCaps()', () => {
    it('can get rollup job caps for rollup index pattern', async () => {
      const indexPattern = 'cloud_roll_index';
      const isRollup = true;
      const { newJobCaps } = newJobCapsProvider(mlClusterClientRollupMock);
      const response = await newJobCaps(indexPattern, isRollup, savedObjectsClientMock);
      expect(response).toEqual(cloudwatchJobCaps);
    });

    it('can get non rollup job caps for rollup index pattern', async () => {
      const indexPattern = 'cloud_roll_index';
      const isRollup = false;
      const { newJobCaps } = newJobCapsProvider(mlClusterClientRollupMock);
      const response = await newJobCaps(indexPattern, isRollup, savedObjectsClientMock);
      expect(response).not.toEqual(cloudwatchJobCaps);
    });
  });
});
