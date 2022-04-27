/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useState, useEffect } from 'react';

import { CaseStatuses } from '@kbn/cases-plugin/common';
import { AllCases } from '@kbn/cases-plugin/common/ui';

import { APP_ID } from '../../../../../common/constants';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useKibana } from '../../../../common/lib/kibana';
import { addError } from '../../../../common/store/app/actions';

import * as i18n from '../translations';

export interface RecentCaseItem {
  name: string;
  note: string;
  createdAt: string;
  createdBy: string;
  status: CaseStatuses;
  id: string;
}

export interface UseRecentlyCreatedCasesProps {
  skip: boolean;
}

export type UseRecentlyCreatedCases = (props: UseRecentlyCreatedCasesProps) => {
  items: RecentCaseItem[];
  isLoading: boolean;
  updatedAt: number;
};

export const useRecentlyCreatedCases: UseRecentlyCreatedCases = ({ skip }) => {
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

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchCases = async () => {
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

        if (isSubscribed) {
          setItems(parseRecentCases(casesResponse as unknown as AllCases));
          setUpdatedAt(Date.now());
        }
      } catch (error) {
        if (isSubscribed) {
          addError(error, { title: i18n.ERROR_MESSAGE_CASES });
        }
      }
      setIsLoading(false);
    };

    if (!skip) {
      fetchCases();
    }

    if (skip) {
      setIsLoading(false);
      isSubscribed = false;
      abortCtrl.abort();
    }

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [cases.api.cases, from, fromDate, skip, to, toDate]);

  return { items, isLoading, updatedAt };
};

function parseRecentCases(casesResponse: AllCases): RecentCaseItem[] {
  const allCases = casesResponse.cases || [];

  return allCases.reduce<RecentCaseItem[]>((accumalatedCases, currentCase) => {
    accumalatedCases.push({
      id: currentCase.id,
      name: currentCase.title,
      note: currentCase.description,
      // @ts-ignore [TO-DO] Need a ticket number, or is this ok?. Incorrect data shape coming in.
      createdAt: currentCase.created_at,
      // @ts-ignore
      createdBy: currentCase.created_by.username || '',
      status: currentCase.status,
    });

    return accumalatedCases;
  }, []);
}
