/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { hostEquality } from './host_equality';
import { AnomaliesHostTableProps } from '../types';
import { HostsType } from '../../../../hosts/store/model';

describe('host_equality', () => {
  test('it returns true if start and end date are equal', () => {
    const prev: AnomaliesHostTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: HostsType.details,
    };
    const next: AnomaliesHostTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: HostsType.details,
    };
    const equal = hostEquality(prev, next);
    expect(equal).toEqual(true);
  });

  test('it returns false if starts are not equal', () => {
    const prev: AnomaliesHostTableProps = {
      startDate: new Date('2001').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: HostsType.details,
    };
    const next: AnomaliesHostTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: HostsType.details,
    };
    const equal = hostEquality(prev, next);
    expect(equal).toEqual(false);
  });

  test('it returns false if starts are not equal for next', () => {
    const prev: AnomaliesHostTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: HostsType.details,
    };
    const next: AnomaliesHostTableProps = {
      startDate: new Date('2001').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: HostsType.details,
    };
    const equal = hostEquality(prev, next);
    expect(equal).toEqual(false);
  });

  test('it returns false if ends are not equal', () => {
    const prev: AnomaliesHostTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2001').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: HostsType.details,
    };
    const next: AnomaliesHostTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: HostsType.details,
    };
    const equal = hostEquality(prev, next);
    expect(equal).toEqual(false);
  });

  test('it returns false if ends are not equal for next', () => {
    const prev: AnomaliesHostTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: HostsType.details,
    };
    const next: AnomaliesHostTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2001').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: HostsType.details,
    };
    const equal = hostEquality(prev, next);
    expect(equal).toEqual(false);
  });

  test('it returns false if skip is not equal', () => {
    const prev: AnomaliesHostTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: true,
      type: HostsType.details,
    };
    const next: AnomaliesHostTableProps = {
      startDate: new Date('2000').toISOString(),
      endDate: new Date('2000').toISOString(),
      narrowDateRange: jest.fn(),
      skip: false,
      type: HostsType.details,
    };
    const equal = hostEquality(prev, next);
    expect(equal).toEqual(false);
  });
});
