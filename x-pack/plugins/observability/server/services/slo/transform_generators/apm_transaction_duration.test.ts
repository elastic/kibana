/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import {
  createAPMTransactionDurationIndicator,
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
} from '../fixtures/slo';
import { ApmTransactionDurationTransformGenerator } from './apm_transaction_duration';

const generator = new ApmTransactionDurationTransformGenerator();

describe('APM Transaction Duration Transform Generator', () => {
  it('returns the expected transform params with every specified indicator params', () => {
    const slo = createSLO({ indicator: createAPMTransactionDurationIndicator() });
    const transform = generator.getTransformParams(slo);

    expect(transform).toMatchSnapshot({
      transform_id: expect.any(String),
      source: { runtime_mappings: { 'slo.id': { script: { source: expect.any(String) } } } },
    });
    expect(transform.transform_id).toEqual(`slo-${slo.id}-${slo.revision}`);
    expect(transform.source.runtime_mappings!['slo.id']).toMatchObject({
      script: { source: `emit('${slo.id}')` },
    });
    expect(transform.source.runtime_mappings!['slo.revision']).toMatchObject({
      script: { source: `emit(${slo.revision})` },
    });
  });

  it('returns the expected transform params for timeslices slo', () => {
    const slo = createSLOWithTimeslicesBudgetingMethod({
      indicator: createAPMTransactionDurationIndicator(),
    });
    const transform = generator.getTransformParams(slo);

    expect(transform).toMatchSnapshot({
      transform_id: expect.any(String),
      source: { runtime_mappings: { 'slo.id': { script: { source: expect.any(String) } } } },
    });
  });

  it("does not include the query filter when params are '*'", () => {
    const slo = createSLO({
      indicator: createAPMTransactionDurationIndicator({
        environment: ALL_VALUE,
        service: ALL_VALUE,
        transactionName: ALL_VALUE,
        transactionType: ALL_VALUE,
      }),
    });
    const transform = generator.getTransformParams(slo);

    expect(transform.source.query).toMatchSnapshot();
  });

  it('uses the provided index params as source index', () => {
    const index = 'my-custom-apm-index*';
    const slo = createSLO({
      indicator: createAPMTransactionDurationIndicator({
        index,
      }),
    });
    const transform = generator.getTransformParams(slo);

    expect(transform.source.index).toEqual(index);
  });

  it('adds the custom kql filter to the query', () => {
    const filter = `"my.field" : "value" and ("foo" >= 12 or "bar" <= 100)`;
    const slo = createSLO({
      indicator: createAPMTransactionDurationIndicator({
        filter,
      }),
    });
    const transform = generator.getTransformParams(slo);

    expect(transform.source.query).toMatchSnapshot();
  });

  it("groups by the 'service.name'", () => {
    const slo = createSLO({
      indicator: createAPMTransactionDurationIndicator({
        service: 'my-service',
        environment: ALL_VALUE,
        transactionName: ALL_VALUE,
        transactionType: ALL_VALUE,
      }),
    });

    const transform = generator.getTransformParams(slo);

    expect(transform.source.query).toMatchSnapshot();
    expect(transform.pivot?.group_by).toMatchSnapshot();
  });

  it("groups by the 'service.environment'", () => {
    const slo = createSLO({
      indicator: createAPMTransactionDurationIndicator({
        service: ALL_VALUE,
        environment: 'production',
        transactionName: ALL_VALUE,
        transactionType: ALL_VALUE,
      }),
    });

    const transform = generator.getTransformParams(slo);

    expect(transform.source.query).toMatchSnapshot();
    expect(transform.pivot?.group_by).toMatchSnapshot();
  });

  it("groups by the 'transaction.name'", () => {
    const slo = createSLO({
      indicator: createAPMTransactionDurationIndicator({
        service: ALL_VALUE,
        environment: ALL_VALUE,
        transactionName: 'GET /foo',
        transactionType: ALL_VALUE,
      }),
    });

    const transform = generator.getTransformParams(slo);

    expect(transform.source.query).toMatchSnapshot();
    expect(transform.pivot?.group_by).toMatchSnapshot();
  });

  it("groups by the 'transaction.type'", () => {
    const slo = createSLO({
      indicator: createAPMTransactionDurationIndicator({
        service: ALL_VALUE,
        environment: ALL_VALUE,
        transactionName: ALL_VALUE,
        transactionType: 'request',
      }),
    });

    const transform = generator.getTransformParams(slo);

    expect(transform.source.query).toMatchSnapshot();
    expect(transform.pivot?.group_by).toMatchSnapshot();
  });
});
