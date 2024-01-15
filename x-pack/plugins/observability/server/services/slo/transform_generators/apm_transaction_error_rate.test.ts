/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import {
  createAPMTransactionErrorRateIndicator,
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
} from '../fixtures/slo';
import { ApmTransactionErrorRateTransformGenerator } from './apm_transaction_error_rate';

const generator = new ApmTransactionErrorRateTransformGenerator();

describe('APM Transaction Error Rate Transform Generator', () => {
  it('returns the expected transform params with every specified indicator params', async () => {
    const slo = createSLO({
      id: 'irrelevant',
      indicator: createAPMTransactionErrorRateIndicator(),
    });
    const transform = generator.getTransformParams(slo);

    expect(transform).toMatchSnapshot();
  });

  it('returns the expected transform params for timeslices slo', async () => {
    const slo = createSLOWithTimeslicesBudgetingMethod({
      id: 'irrelevant',
      indicator: createAPMTransactionErrorRateIndicator(),
    });
    const transform = generator.getTransformParams(slo);

    expect(transform).toMatchSnapshot();
  });

  it("does not include the query filter when params are '*'", async () => {
    const slo = createSLO({
      indicator: createAPMTransactionErrorRateIndicator({
        environment: ALL_VALUE,
        service: ALL_VALUE,
        transactionName: ALL_VALUE,
        transactionType: ALL_VALUE,
      }),
    });
    const transform = generator.getTransformParams(slo);

    expect(transform.source.query).toMatchSnapshot();
  });

  it('uses the provided index params as source index', async () => {
    const index = 'my-custom-apm-index*';
    const slo = createSLO({
      indicator: createAPMTransactionErrorRateIndicator({
        index,
      }),
    });
    const transform = generator.getTransformParams(slo);

    expect(transform.source.index).toEqual(index);
  });

  it('adds the custom kql filter to the query', async () => {
    const filter = `"my.field" : "value" and ("foo" >= 12 or "bar" <= 100)`;
    const slo = createSLO({
      indicator: createAPMTransactionErrorRateIndicator({
        filter,
      }),
    });
    const transform = generator.getTransformParams(slo);

    expect(transform.source.query).toMatchSnapshot();
  });

  it("groups by the 'service.name'", () => {
    const slo = createSLO({
      indicator: createAPMTransactionErrorRateIndicator({
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
      indicator: createAPMTransactionErrorRateIndicator({
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
      indicator: createAPMTransactionErrorRateIndicator({
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
      indicator: createAPMTransactionErrorRateIndicator({
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
