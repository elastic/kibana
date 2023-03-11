/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getKueryFields } from './get_kuery_fields';
import { fromKueryExpression } from '@kbn/es-query';

describe('get kuery fields', () => {
  it('returns single kuery field', () => {
    const kuery = 'service.name: my-service';
    const kueryNode = fromKueryExpression(kuery);
    expect(getKueryFields([kueryNode])).toEqual(['service.name']);
  });

  it('returns kuery fields with wildcard', () => {
    const kuery = 'service.name: *';
    const kueryNode = fromKueryExpression(kuery);
    expect(getKueryFields([kueryNode])).toEqual(['service.name']);
  });

  it('returns multiple fields used AND operator', () => {
    const kuery =
      'service.name: my-service AND service.environment: production';
    const kueryNode = fromKueryExpression(kuery);
    expect(getKueryFields([kueryNode])).toEqual([
      'service.name',
      'service.environment',
    ]);
  });

  it('returns multiple kuery fields with OR operator', () => {
    const kuery = 'network.carrier.mcc: test or child.id: 33';
    const kueryNode = fromKueryExpression(kuery);
    expect(getKueryFields([kueryNode])).toEqual([
      'network.carrier.mcc',
      'child.id',
    ]);
  });

  it('returns multiple kuery fields with wildcard', () => {
    const kuery = 'network.carrier.mcc:* or child.id: *';
    const kueryNode = fromKueryExpression(kuery);
    expect(getKueryFields([kueryNode])).toEqual([
      'network.carrier.mcc',
      'child.id',
    ]);
  });

  it('returns single kuery fields with gt operator', () => {
    const kuery = 'transaction.duration.aggregate > 10';
    const kueryNode = fromKueryExpression(kuery);
    expect(getKueryFields([kueryNode])).toEqual([
      'transaction.duration.aggregate',
    ]);
  });

  it('returns dublicate fields', () => {
    const kueries = [
      'service.name: my-service',
      'service.name: my-service and trace.id: trace',
    ];

    const kueryNodes = kueries.map((kuery) => fromKueryExpression(kuery));
    expect(getKueryFields(kueryNodes)).toEqual([
      'service.name',
      'service.name',
      'trace.id',
    ]);
  });

  it('returns multiple fields with multiple logical operators', () => {
    const kuery =
      '(service.name:opbeans-* OR service.name:kibana) and (service.environment:production)';
    const kueryNode = fromKueryExpression(kuery);
    expect(getKueryFields([kueryNode])).toEqual([
      'service.name',
      'service.name',
      'service.environment',
    ]);
  });

  it('do not return if kuery field is null', () => {
    const kuery = 'opbean';
    const kueryNode = fromKueryExpression(kuery);
    expect(getKueryFields([kueryNode])).toEqual([]);
  });
});
