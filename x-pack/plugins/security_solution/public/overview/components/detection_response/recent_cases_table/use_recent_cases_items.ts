/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useState, useEffect, useCallback } from 'react';

import { CaseStatuses } from '@kbn/cases-plugin/common';
import { AllCases } from '@kbn/cases-plugin/common/ui';

import { APP_ID } from '../../../../../common/constants';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useKibana } from '../../../../common/lib/kibana';
import { addError } from '../../../../common/store/app/actions';

export interface RecentCaseItem {
  name: string;
  note: string;
  createdAt: string;
  createdBy: string;
  status: CaseStatuses;
  id: string;
}

export interface UseRecentlyOpenedCasesProps {
  skip: boolean;
}

export type UseRecentlyOpenedCases = (props: UseRecentlyOpenedCasesProps) => {
  items: RecentCaseItem[];
  isLoading: boolean;
  updatedAt: number;
};

export const useRecentlyOpenedCases: UseRecentlyOpenedCases = ({ skip }) => {
  const {
    services: { cases },
  } = useKibana();
  const { to, from } = useGlobalTime();
  const [isLoading, setIsLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [items, setItems] = useState<RecentCaseItem[]>([]);

  // This is a known issue of cases api, it doesn't accept date time format atm
  // Once they fix this problem we can remove this two lines
  // [TO-DO] #130979
  const fromDate = moment(from).format('YYYY-MM-DD');
  const toDate = moment(to).format('YYYY-MM-DD');

  const fetchCases = useCallback(async () => {
    try {
      const casesResponse = await cases.api.cases.find({
        from: fromDate,
        to: toDate,
        owner: APP_ID,
        sortField: 'create_at',
        sortOrder: 'desc',
        page: 1,
        perPage: 4,
      });

      setItems(parseRecentCases(casesResponse as unknown as AllCases));
    } catch (err) {
      addError(err);
    }

    setIsLoading(false);
    setUpdatedAt(Date.now());
  }, [cases.api.cases, fromDate, toDate]);

  useEffect(() => {
    if (skip) {
      setIsLoading(false);
    } else {
      fetchCases();
    }
  }, [fetchCases, skip]);

  return { items, isLoading, updatedAt };
};

function parseRecentCases(casesResponse: AllCases): RecentCaseItem[] {
  const allCases = casesResponse.cases || [];

  return allCases.reduce<RecentCaseItem[]>((accumalatedCases, currentCase) => {
    accumalatedCases.push({
      id: currentCase.id,
      name: currentCase.title,
      note: currentCase.description,
      // @ts-ignore [TO-DO]
      createdAt: currentCase.created_at,
      // @ts-ignore
      createdBy: currentCase.created_by.username || '',
      status: currentCase.status,
    });

    return accumalatedCases;
  }, []);
}
