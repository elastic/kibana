/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { ACTION_URL } from '../../../../../../cases/common';
import { KibanaServices } from '../../../../common/lib/kibana';

interface CaseAction {
  actionTypeId: string;
  id: string;
  isPreconfigured: boolean;
  name: string;
  referencedByCount: number;
}

const CASE_ACTION_NAME = 'Cases';

export const useManageCaseAction = () => {
  const hasInit = useRef(true);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const abortCtrl = new AbortController();
    const fetchActions = async () => {
      try {
        const actions = await KibanaServices.get().http.fetch<CaseAction[]>(ACTION_URL, {
          method: 'GET',
          signal: abortCtrl.signal,
        });
        if (!actions.some((a) => a.actionTypeId === '.case' && a.name === CASE_ACTION_NAME)) {
          await KibanaServices.get().http.post<CaseAction[]>(`${ACTION_URL}/action`, {
            method: 'POST',
            body: JSON.stringify({
              actionTypeId: '.case',
              config: {},
              name: CASE_ACTION_NAME,
              secrets: {},
            }),
            signal: abortCtrl.signal,
          });
        }
        setLoading(false);
      } catch {
        setLoading(false);
        setHasError(true);
      }
    };
    if (hasInit.current) {
      hasInit.current = false;
      fetchActions();
    }

    return () => {
      abortCtrl.abort();
    };
  }, []);
  return [loading, hasError];
};
