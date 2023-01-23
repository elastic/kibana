/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createAPMTransactionDurationIndicator,
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
} from '../fixtures/slo';
import { ApmTransactionDurationTransformGenerator } from './apm_transaction_duration';

const generator = new ApmTransactionDurationTransformGenerator();

describe('APM Transaction Duration Transform Generator', () => {
  it('returns the expected transform params with every specified indicator params', async () => {
    const anSLO = createSLO({ indicator: createAPMTransactionDurationIndicator() });
    const transform = generator.getTransformParams(anSLO);

    expect(transform).toMatchSnapshot({
      transform_id: expect.any(String),
      source: { runtime_mappings: { 'slo.id': { script: { source: expect.any(String) } } } },
    });
    expect(transform.transform_id).toEqual(`slo-${anSLO.id}-${anSLO.revision}`);
    expect(transform.source.runtime_mappings!['slo.id']).toMatchObject({
      script: { source: `emit('${anSLO.id}')` },
    });
    expect(transform.source.runtime_mappings!['slo.revision']).toMatchObject({
      script: { source: `emit(${anSLO.revision})` },
    });
  });

  it('returns the expected transform params for timeslices slo', async () => {
    const anSLO = createSLOWithTimeslicesBudgetingMethod({
      indicator: createAPMTransactionDurationIndicator(),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform).toMatchSnapshot({
      transform_id: expect.any(String),
      source: { runtime_mappings: { 'slo.id': { script: { source: expect.any(String) } } } },
    });
  });

  it("does not include the query filter when params are '*'", async () => {
    const anSLO = createSLO({
      indicator: createAPMTransactionDurationIndicator({
        environment: '*',
        service: '*',
        transactionName: '*',
        transactionType: '*',
      }),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform.source.query).toMatchSnapshot();
  });

  it('uses the provided index params as source index', async () => {
    const index = 'my-custom-apm-index*';
    const anSLO = createSLO({
      indicator: createAPMTransactionDurationIndicator({
        index,
      }),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform.source.index).toEqual(index);
  });
});
