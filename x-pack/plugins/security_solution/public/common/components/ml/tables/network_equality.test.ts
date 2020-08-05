/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { networkEquality } from './network_equality';
import { AnomaliesNetworkTableProps } from '../types';
import { NetworkType } from '../../../../network/store/model';
import { FlowTarget } from '../../../../graphql/types';

describe('network_equality', () => {
  test('it returns true if start and end date are equal', () => {
    const prev: AnomaliesNetworkTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: NetworkType.details,
    };
    const next: AnomaliesNetworkTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: NetworkType.details,
    };
    const equal = networkEquality(prev, next);
    expect(equal).toEqual(true);
  });

  test('it returns false if starts are not equal', () => {
    const prev: AnomaliesNetworkTableProps = {
      startDate: new Date('2001').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: NetworkType.details,
    };
    const next: AnomaliesNetworkTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: NetworkType.details,
    };
    const equal = networkEquality(prev, next);
    expect(equal).toEqual(false);
  });

  test('it returns false if starts are not equal for next', () => {
    const prev: AnomaliesNetworkTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: NetworkType.details,
    };
    const next: AnomaliesNetworkTableProps = {
      startDate: new Date('2001').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: NetworkType.details,
    };
    const equal = networkEquality(prev, next);
    expect(equal).toEqual(false);
  });

  test('it returns false if ends are not equal', () => {
    const prev: AnomaliesNetworkTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2001').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: NetworkType.details,
    };
    const next: AnomaliesNetworkTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: NetworkType.details,
    };
    const equal = networkEquality(prev, next);
    expect(equal).toEqual(false);
  });

  test('it returns false if ends are not equal for next', () => {
    const prev: AnomaliesNetworkTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: NetworkType.details,
    };
    const next: AnomaliesNetworkTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2001').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: NetworkType.details,
    };
    const equal = networkEquality(prev, next);
    expect(equal).toEqual(false);
  });

  test('it returns false if skip is not equal', () => {
    const prev: AnomaliesNetworkTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: true,
      type: NetworkType.details,
    };
    const next: AnomaliesNetworkTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: NetworkType.details,
    };
    const equal = networkEquality(prev, next);
    expect(equal).toEqual(false);
  });

  test('it returns false if flowType is not equal', () => {
    const prev: AnomaliesNetworkTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: true,
      type: NetworkType.details,
      flowTarget: FlowTarget.source,
    };
    const next: AnomaliesNetworkTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: NetworkType.details,
      flowTarget: FlowTarget.destination,
    };
    const equal = networkEquality(prev, next);
    expect(equal).toEqual(false);
  });
});
