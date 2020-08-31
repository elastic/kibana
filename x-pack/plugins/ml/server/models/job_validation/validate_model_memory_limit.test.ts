/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient } from 'kibana/server';
import { CombinedJob, Detector } from '../../../common/types/anomaly_detection_jobs';
import { ModelMemoryEstimate } from '../calculate_model_memory_limit/calculate_model_memory_limit';
import { validateModelMemoryLimit } from './validate_model_memory_limit';

describe('ML - validateModelMemoryLimit', () => {
  // mock info endpoint response
  const mlInfoResponse = {
    defaults: {
      anomaly_detectors: {
        model_memory_limit: '1gb',
        categorization_examples_limit: 4,
        model_snapshot_retention_days: 1,
      },
      datafeeds: {
        scroll_size: 1000,
      },
    },
    limits: {
      max_model_memory_limit: '30mb',
      effective_max_model_memory_limit: '40mb',
    },
  };

  // mock field caps response
  const fieldCapsResponse = {
    indices: ['cloudwatch'],
    fields: {
      instance: {
        keyword: {
          type: 'keyword',
          searchable: true,
          aggregatable: true,
        },
      },
    },
  };

  // mock cardinality search response
  const cardinalitySearchResponse = {
    took: 8,
    timed_out: false,
    _shards: {
      total: 15,
      successful: 15,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: 1793481,
      max_score: 0,
      hits: [],
    },
    aggregations: {
      instance: {
        value: 77,
      },
    },
  };

  // mock estimate model memory
  const modelMemoryEstimateResponse: ModelMemoryEstimate = {
    model_memory_estimate: '40mb',
  };

  interface MockAPICallResponse {
    'ml.estimateModelMemory'?: ModelMemoryEstimate;
  }

  // mock callAsCurrentUser
  // used in three places:
  // - to retrieve the info endpoint
  // - to search for cardinality of split field
  // - to retrieve field capabilities used in search for split field cardinality
  const getMockMlClusterClient = ({
    'ml.estimateModelMemory': estimateModelMemory,
  }: MockAPICallResponse = {}): ILegacyScopedClusterClient => {
    const callAs = (call: string) => {
      if (typeof call === undefined) {
        return Promise.reject();
      }

      let response = {};
      if (call === 'ml.info') {
        response = mlInfoResponse;
      } else if (call === 'search') {
        response = cardinalitySearchResponse;
      } else if (call === 'fieldCaps') {
        response = fieldCapsResponse;
      } else if (call === 'ml.estimateModelMemory') {
        response = estimateModelMemory || modelMemoryEstimateResponse;
      }
      return Promise.resolve(response);
    };

    return {
      callAsCurrentUser: callAs,
      callAsInternalUser: callAs,
    };
  };

  function getJobConfig(influencers: string[] = [], detectors: Detector[] = []) {
    return ({
      analysis_config: { detectors, influencers },
      data_description: { time_field: '@timestamp' },
      datafeed_config: {
        indices: [],
      },
      analysis_limits: {
        model_memory_limit: '20mb',
      },
    } as unknown) as CombinedJob;
  }

  // create a specified number of mock detectors
  function createDetectors(numberOfDetectors: number): Detector[] {
    const dtrs = [];
    for (let i = 0; i < numberOfDetectors; i++) {
      dtrs.push({
        function: 'mean',
        field_name: `foo${i}`,
        partition_field_name: 'instance',
      });
    }
    return dtrs as Detector[];
  }

  it('Called with no duration or split and mml within limit', () => {
    const job = getJobConfig();
    const duration = undefined;

    return validateModelMemoryLimit(getMockMlClusterClient(), job, duration).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toEqual([]);
    });
  });

  it('Called with no duration or split and mml above limit', () => {
    const job = getJobConfig();
    const duration = undefined;
    // @ts-expect-error
    job.analysis_limits.model_memory_limit = '31mb';

    return validateModelMemoryLimit(getMockMlClusterClient(), job, duration).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toEqual(['mml_greater_than_max_mml']);
    });
  });

  it('Called large number of detectors, causing estimated mml to be over the max', () => {
    const dtrs = createDetectors(10);
    const job = getJobConfig(['instance'], dtrs);
    const duration = { start: 0, end: 1 };
    // @ts-expect-error
    job.analysis_limits.model_memory_limit = '20mb';

    return validateModelMemoryLimit(
      getMockMlClusterClient({ 'ml.estimateModelMemory': { model_memory_estimate: '66mb' } }),
      job,
      duration
    ).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toEqual(['estimated_mml_greater_than_max_mml']);
    });
  });

  it('Called with small number of detectors, so estimated mml is under max', () => {
    const dtrs = createDetectors(2);
    const job = getJobConfig(['instance'], dtrs);
    const duration = { start: 0, end: 1 };
    // @ts-expect-error
    job.analysis_limits.model_memory_limit = '30mb';

    return validateModelMemoryLimit(
      getMockMlClusterClient({ 'ml.estimateModelMemory': { model_memory_estimate: '24mb' } }),
      job,
      duration
    ).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toEqual(['success_mml']);
    });
  });

  it('Called enough detectors to cause estimated mml to be over specified mml', () => {
    const dtrs = createDetectors(2);
    const job = getJobConfig(['instance'], dtrs);
    const duration = { start: 0, end: 1 };
    // @ts-expect-error
    job.analysis_limits.model_memory_limit = '10mb';

    return validateModelMemoryLimit(
      getMockMlClusterClient({ 'ml.estimateModelMemory': { model_memory_estimate: '22mb' } }),
      job,
      duration
    ).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toEqual(['half_estimated_mml_greater_than_mml']);
    });
  });

  it('Called with enough detectors to cause estimated mml to be over specified mml, no max setting', () => {
    const dtrs = createDetectors(2);
    const job = getJobConfig(['instance'], dtrs);
    const duration = { start: 0, end: 1 };
    // @ts-expect-error
    delete mlInfoResponse.limits.max_model_memory_limit;
    // @ts-expect-error
    job.analysis_limits.model_memory_limit = '10mb';

    return validateModelMemoryLimit(getMockMlClusterClient(), job, duration).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toEqual(['half_estimated_mml_greater_than_mml']);
    });
  });

  it('Called with no duration or split and mml above limit, no max setting', () => {
    const job = getJobConfig();
    const duration = undefined;
    // @ts-expect-error
    job.analysis_limits.model_memory_limit = '31mb';

    return validateModelMemoryLimit(getMockMlClusterClient(), job, duration).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toEqual([]);
    });
  });

  it('Called with no duration or split and mml above limit, no max setting, above effective max mml', () => {
    const job = getJobConfig();
    const duration = undefined;
    // @ts-expect-error
    job.analysis_limits.model_memory_limit = '41mb';

    return validateModelMemoryLimit(getMockMlClusterClient(), job, duration).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toEqual(['mml_greater_than_effective_max_mml']);
    });
  });

  it('Called with small number of detectors, so estimated mml is under specified mml, no max setting', () => {
    const dtrs = createDetectors(1);
    const job = getJobConfig(['instance'], dtrs);
    const duration = { start: 0, end: 1 };
    // @ts-expect-error
    job.analysis_limits.model_memory_limit = '20mb';

    return validateModelMemoryLimit(
      getMockMlClusterClient({ 'ml.estimateModelMemory': { model_memory_estimate: '19mb' } }),
      job,
      duration
    ).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toEqual(['success_mml']);
    });
  });

  it('Called with specified invalid mml of "0mb"', () => {
    const dtrs = createDetectors(1);
    const job = getJobConfig(['instance'], dtrs);
    const duration = { start: 0, end: 1 };
    // @ts-expect-error
    job.analysis_limits.model_memory_limit = '0mb';

    return validateModelMemoryLimit(getMockMlClusterClient(), job, duration).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toEqual(['mml_value_invalid']);
    });
  });

  it('Called with specified invalid mml of "10mbananas"', () => {
    const dtrs = createDetectors(1);
    const job = getJobConfig(['instance'], dtrs);
    const duration = { start: 0, end: 1 };
    // @ts-expect-error
    job.analysis_limits.model_memory_limit = '10mbananas';

    return validateModelMemoryLimit(getMockMlClusterClient(), job, duration).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toEqual(['mml_value_invalid']);
    });
  });

  it('Called with specified invalid mml of "10"', () => {
    const dtrs = createDetectors(1);
    const job = getJobConfig(['instance'], dtrs);
    const duration = { start: 0, end: 1 };
    // @ts-expect-error
    job.analysis_limits.model_memory_limit = '10';

    return validateModelMemoryLimit(getMockMlClusterClient(), job, duration).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toEqual(['mml_value_invalid']);
    });
  });

  it('Called with specified invalid mml of "mb"', () => {
    const dtrs = createDetectors(1);
    const job = getJobConfig(['instance'], dtrs);
    const duration = { start: 0, end: 1 };
    // @ts-expect-error
    job.analysis_limits.model_memory_limit = 'mb';

    return validateModelMemoryLimit(getMockMlClusterClient(), job, duration).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toEqual(['mml_value_invalid']);
    });
  });

  it('Called with specified invalid mml of "asdf"', () => {
    const dtrs = createDetectors(1);
    const job = getJobConfig(['instance'], dtrs);
    const duration = { start: 0, end: 1 };
    // @ts-expect-error
    job.analysis_limits.model_memory_limit = 'asdf';

    return validateModelMemoryLimit(getMockMlClusterClient(), job, duration).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toEqual(['mml_value_invalid']);
    });
  });

  it('Called with specified invalid mml of "1023KB"', () => {
    const dtrs = createDetectors(1);
    const job = getJobConfig(['instance'], dtrs);
    const duration = { start: 0, end: 1 };
    // @ts-expect-error
    job.analysis_limits.model_memory_limit = '1023KB';

    return validateModelMemoryLimit(getMockMlClusterClient(), job, duration).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toEqual(['mml_value_invalid']);
    });
  });

  it('Called with specified valid mml of "1024KB", still triggers a warning', () => {
    const dtrs = createDetectors(1);
    const job = getJobConfig(['instance'], dtrs);
    const duration = { start: 0, end: 1 };
    // @ts-expect-error
    job.analysis_limits.model_memory_limit = '1024KB';

    return validateModelMemoryLimit(getMockMlClusterClient(), job, duration).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toEqual(['half_estimated_mml_greater_than_mml']);
    });
  });

  it('Called with specified valid mml of "6MB", still triggers info', () => {
    const dtrs = createDetectors(1);
    const job = getJobConfig(['instance'], dtrs);
    const duration = { start: 0, end: 1 };
    // @ts-expect-error
    job.analysis_limits.model_memory_limit = '6MB';

    return validateModelMemoryLimit(getMockMlClusterClient(), job, duration).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toEqual(['half_estimated_mml_greater_than_mml']);
    });
  });

  it('Called with specified valid mml of "20MB", triggers success message', () => {
    const dtrs = createDetectors(1);
    const job = getJobConfig(['instance'], dtrs);
    const duration = { start: 0, end: 1 };
    // @ts-expect-error
    job.analysis_limits.model_memory_limit = '20MB';

    return validateModelMemoryLimit(
      getMockMlClusterClient({ 'ml.estimateModelMemory': { model_memory_estimate: '20mb' } }),
      job,
      duration
    ).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toEqual(['success_mml']);
    });
  });
});
