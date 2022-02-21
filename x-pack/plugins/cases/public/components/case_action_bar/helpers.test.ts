/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../../common/api';
import { basicCase } from '../../containers/mock';
import { getStatusDate, getStatusTitle } from './helpers';

describe('helpers', () => {
  const caseData = {
    ...basicCase,
    status: CaseStatuses.open,
    createdAt: 'createAt',
    updatedAt: 'updatedAt',
    closedAt: 'closedAt',
  };

  describe('getStatusDate', () => {
    it('it return the createdAt when the status is open', () => {
      expect(getStatusDate(caseData)).toBe(caseData.createdAt);
    });

    it('it return the createdAt when the status is in-progress', () => {
      expect(getStatusDate({ ...caseData, status: CaseStatuses['in-progress'] })).toBe(
        caseData.updatedAt
      );
    });

    it('it return the createdAt when the status is closed', () => {
      expect(getStatusDate({ ...caseData, status: CaseStatuses.closed })).toBe(caseData.closedAt);
    });
  });

  describe('getStatusTitle', () => {
    it('it return the correct title for open status', () => {
      expect(getStatusTitle(CaseStatuses.open)).toBe('Case opened');
    });

    it('it return the correct title for in-progress status', () => {
      expect(getStatusTitle(CaseStatuses['in-progress'])).toBe('Case in progress');
    });

    it('it return the correct title for closed status', () => {
      expect(getStatusTitle(CaseStatuses.closed)).toBe('Case closed');
    });
  });
});
