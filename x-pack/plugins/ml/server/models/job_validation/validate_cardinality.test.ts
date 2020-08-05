/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { ILegacyScopedClusterClient } from 'kibana/server';

import { CombinedJob } from '../../../common/types/anomaly_detection_jobs';

import mockFareQuoteCardinality from './__mocks__/mock_farequote_cardinality.json';
import mockFieldCaps from './__mocks__/mock_field_caps.json';

import { validateCardinality } from './validate_cardinality';

const mockResponses = {
  search: mockFareQuoteCardinality,
  fieldCaps: mockFieldCaps,
};

// mock mlClusterClientFactory
const mlClusterClientFactory = (
  responses: Record<string, any>,
  fail = false
): ILegacyScopedClusterClient => {
  const callAs = (requestName: string) => {
    return new Promise((resolve, reject) => {
      const response = responses[requestName];
      if (fail) {
        reject(response);
      } else {
        resolve(response);
      }
    }) as Promise<any>;
  };
  return {
    callAsCurrentUser: callAs,
    callAsInternalUser: callAs,
  };
};

describe('ML - validateCardinality', () => {
  it('called without arguments', (done) => {
    validateCardinality(mlClusterClientFactory(mockResponses)).then(
      () => done(new Error('Promise should not resolve for this test without job argument.')),
      () => done()
    );
  });

  it('called with non-valid job argument #1, missing analysis_config', (done) => {
    validateCardinality(mlClusterClientFactory(mockResponses), {} as CombinedJob).then(
      () => done(new Error('Promise should not resolve for this test without valid job argument.')),
      () => done()
    );
  });

  it('called with non-valid job argument #2, missing datafeed_config', (done) => {
    validateCardinality(mlClusterClientFactory(mockResponses), {
      analysis_config: {},
    } as CombinedJob).then(
      () => done(new Error('Promise should not resolve for this test without valid job argument.')),
      () => done()
    );
  });

  it('called with non-valid job argument #3, missing datafeed_config.indices', (done) => {
    const job = { analysis_config: {}, datafeed_config: {} } as CombinedJob;
    validateCardinality(mlClusterClientFactory(mockResponses), job).then(
      () => done(new Error('Promise should not resolve for this test without valid job argument.')),
      () => done()
    );
  });

  it('called with non-valid job argument #4, missing data_description', (done) => {
    const job = ({
      analysis_config: {},
      datafeed_config: { indices: [] },
    } as unknown) as CombinedJob;
    validateCardinality(mlClusterClientFactory(mockResponses), job).then(
      () => done(new Error('Promise should not resolve for this test without valid job argument.')),
      () => done()
    );
  });

  it('called with non-valid job argument #5, missing data_description.time_field', (done) => {
    const job = ({
      analysis_config: {},
      data_description: {},
      datafeed_config: { indices: [] },
    } as unknown) as CombinedJob;
    validateCardinality(mlClusterClientFactory(mockResponses), job).then(
      () => done(new Error('Promise should not resolve for this test without valid job argument.')),
      () => done()
    );
  });

  it('called with non-valid job argument #6, missing analysis_config.influencers', (done) => {
    const job = ({
      analysis_config: {},
      datafeed_config: { indices: [] },
      data_description: { time_field: '@timestamp' },
    } as unknown) as CombinedJob;
    validateCardinality(mlClusterClientFactory(mockResponses), job).then(
      () => done(new Error('Promise should not resolve for this test without valid job argument.')),
      () => done()
    );
  });

  it('minimum job configuration to pass cardinality check code', () => {
    const job = ({
      analysis_config: { detectors: [], influencers: [] },
      data_description: { time_field: '@timestamp' },
      datafeed_config: {
        indices: [],
      },
    } as unknown) as CombinedJob;

    return validateCardinality(mlClusterClientFactory(mockResponses), job).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual([]);
    });
  });

  const getJobConfig = (fieldName: string) => ({
    analysis_config: {
      detectors: [
        {
          function: 'count',
          [fieldName]: 'airline',
        },
      ],
      influencers: [],
    },
    data_description: { time_field: '@timestamp' },
    datafeed_config: {
      indices: [],
    },
  });

  const testCardinality = (
    fieldName: string,
    cardinality: number,
    test: (ids: string[]) => void
  ) => {
    const job = getJobConfig(fieldName);
    const mockCardinality = _.cloneDeep(mockResponses);
    mockCardinality.search.aggregations.airline_cardinality.value = cardinality;
    return validateCardinality(
      mlClusterClientFactory(mockCardinality),
      (job as unknown) as CombinedJob
    ).then((messages) => {
      const ids = messages.map((m) => m.id);
      test(ids);
    });
  };

  it(`field '_source' not aggregatable`, () => {
    const job = getJobConfig('partition_field_name');
    job.analysis_config.detectors[0].partition_field_name = '_source';
    return validateCardinality(
      mlClusterClientFactory(mockResponses),
      (job as unknown) as CombinedJob
    ).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual(['field_not_aggregatable']);
    });
  });

  it(`field 'airline' aggregatable`, () => {
    const job = getJobConfig('partition_field_name');
    return validateCardinality(
      mlClusterClientFactory(mockResponses),
      (job as unknown) as CombinedJob
    ).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual(['success_cardinality']);
    });
  });

  it('field not aggregatable', () => {
    const job = getJobConfig('partition_field_name');
    return validateCardinality(mlClusterClientFactory({}), (job as unknown) as CombinedJob).then(
      (messages) => {
        const ids = messages.map((m) => m.id);
        expect(ids).toStrictEqual(['field_not_aggregatable']);
      }
    );
  });

  it('fields not aggregatable', () => {
    const job = getJobConfig('partition_field_name');
    job.analysis_config.detectors.push({
      function: 'count',
      partition_field_name: 'airline',
    });
    return validateCardinality(
      mlClusterClientFactory({}, true),
      (job as unknown) as CombinedJob
    ).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual(['fields_not_aggregatable']);
    });
  });

  it('valid partition field cardinality', () => {
    return testCardinality('partition_field_name', 50, (ids) => {
      expect(ids).toStrictEqual(['success_cardinality']);
    });
  });

  it('too high partition field cardinality', () => {
    return testCardinality('partition_field_name', 1001, (ids) => {
      expect(ids).toStrictEqual(['cardinality_partition_field']);
    });
  });

  it('valid by field cardinality', () => {
    return testCardinality('by_field_name', 50, (ids) => {
      expect(ids).toStrictEqual(['success_cardinality']);
    });
  });

  it('too high by field cardinality', () => {
    return testCardinality('by_field_name', 1001, (ids) => {
      expect(ids).toStrictEqual(['cardinality_by_field']);
    });
  });

  it('valid over field cardinality', () => {
    return testCardinality('over_field_name', 50, (ids) => {
      expect(ids).toStrictEqual(['success_cardinality']);
    });
  });

  it('too low over field cardinality', () => {
    return testCardinality('over_field_name', 9, (ids) => {
      expect(ids).toStrictEqual(['cardinality_over_field_low']);
    });
  });

  it('too high over field cardinality', () => {
    return testCardinality('over_field_name', 1000001, (ids) => {
      expect(ids).toStrictEqual(['cardinality_over_field_high']);
    });
  });

  const cardinality = 10000;
  it(`disabled model_plot, over field cardinality of ${cardinality} doesn't trigger a warning`, () => {
    const job = (getJobConfig('over_field_name') as unknown) as CombinedJob;
    job.model_plot_config = { enabled: false };
    const mockCardinality = _.cloneDeep(mockResponses);
    mockCardinality.search.aggregations.airline_cardinality.value = cardinality;
    return validateCardinality(mlClusterClientFactory(mockCardinality), job).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual(['success_cardinality']);
    });
  });

  it(`enabled model_plot, over field cardinality of ${cardinality} triggers a model plot warning`, () => {
    const job = (getJobConfig('over_field_name') as unknown) as CombinedJob;
    job.model_plot_config = { enabled: true };
    const mockCardinality = _.cloneDeep(mockResponses);
    mockCardinality.search.aggregations.airline_cardinality.value = cardinality;
    return validateCardinality(mlClusterClientFactory(mockCardinality), job).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual(['cardinality_model_plot_high']);
    });
  });

  it(`disabled model_plot, by field cardinality of ${cardinality} triggers a field cardinality warning`, () => {
    const job = (getJobConfig('by_field_name') as unknown) as CombinedJob;
    job.model_plot_config = { enabled: false };
    const mockCardinality = _.cloneDeep(mockResponses);
    mockCardinality.search.aggregations.airline_cardinality.value = cardinality;
    return validateCardinality(mlClusterClientFactory(mockCardinality), job).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual(['cardinality_by_field']);
    });
  });

  it(`enabled model_plot, by field cardinality of ${cardinality} triggers a model plot warning and field cardinality warning`, () => {
    const job = (getJobConfig('by_field_name') as unknown) as CombinedJob;
    job.model_plot_config = { enabled: true };
    const mockCardinality = _.cloneDeep(mockResponses);
    mockCardinality.search.aggregations.airline_cardinality.value = cardinality;
    return validateCardinality(mlClusterClientFactory(mockCardinality), job).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual(['cardinality_model_plot_high', 'cardinality_by_field']);
    });
  });

  it(`enabled model_plot with terms, by field cardinality of ${cardinality} triggers just field cardinality warning`, () => {
    const job = (getJobConfig('by_field_name') as unknown) as CombinedJob;
    job.model_plot_config = { enabled: true, terms: 'AAL,AAB' };
    const mockCardinality = _.cloneDeep(mockResponses);
    mockCardinality.search.aggregations.airline_cardinality.value = cardinality;
    return validateCardinality(mlClusterClientFactory(mockCardinality), job).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual(['cardinality_by_field']);
    });
  });
});
