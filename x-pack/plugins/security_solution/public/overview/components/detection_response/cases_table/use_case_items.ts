/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useMemo } from 'react';

import type { CaseStatuses } from '@kbn/cases-plugin/common';
import type { Cases } from '@kbn/cases-plugin/common/ui';

import { v4 as uuid } from 'uuid';
import { APP_ID } from '../../../../../common/constants';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useKibana } from '../../../../common/lib/kibana';
import { addError } from '../../../../common/store/app/actions';

import * as i18n from '../translations';

export interface CaseItem {
  name: string;
  totalAlerts: number;
  createdAt: string;
  createdBy: string;
  status: CaseStatuses;
  id: string;
}

export interface UseCaseItemsProps {
  skip: boolean;
}

export type UseCaseItems = (props: UseCaseItemsProps) => {
  items: CaseItem[];
  isLoading: boolean;
  updatedAt: number;
};

export const useCaseItems: UseCaseItems = ({ skip }) => {
  const {
    services: { cases },
  } = useKibana();
  const { to, from, setQuery, deleteQuery } = useGlobalTime();
  const [isLoading, setIsLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [items, setItems] = useState<CaseItem[]>([]);
  // create a unique, but stable (across re-renders) query id
  const uniqueQueryId = useMemo(() => `useCaseItems-${uuid()}`, []);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchCases = async () => {
      try {
        const casesResponse = await cases.api.cases.find({
          from,
          to,
          owner: APP_ID,
          sortField: 'create_at',
          sortOrder: 'desc',
          page: 1,
          perPage: 4,
        });

        if (isSubscribed) {
          setItems(parseCases(casesResponse));
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

      setQuery({
        id: uniqueQueryId,
        inspect: null,
        loading: false,
        refetch: fetchCases,
      });
    }

    if (skip) {
      setIsLoading(false);
      isSubscribed = false;
      abortCtrl.abort();
    }

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
      deleteQuery({ id: uniqueQueryId });
    };
  }, [cases.api.cases, from, skip, to, setQuery, deleteQuery, uniqueQueryId]);

  return { items, isLoading, updatedAt };
};

function parseCases(casesResponse: Cases): CaseItem[] {
  const allCases = casesResponse.cases || [];

  return allCases.reduce<CaseItem[]>((accumulated, currentCase) => {
    accumulated.push({
      id: currentCase.id,
      name: currentCase.title,
      totalAlerts: currentCase.totalAlerts,
      createdAt: currentCase.createdAt,
      createdBy: currentCase.createdBy.username || '—',
      status: currentCase.status,
    });

    return accumulated;
  }, []);
}
