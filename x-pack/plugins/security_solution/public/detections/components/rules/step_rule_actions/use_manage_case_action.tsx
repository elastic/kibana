/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { getAllConnectorsUrl, getCreateConnectorUrl } from '@kbn/cases-plugin/common';
import { convertArrayToCamelCase, KibanaServices } from '../../../../common/lib/kibana';

interface CaseAction {
  connectorTypeId: string;
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
        const actions = convertArrayToCamelCase(
          await KibanaServices.get().http.fetch<CaseAction[]>(getAllConnectorsUrl(), {
            method: 'GET',
            signal: abortCtrl.signal,
          })
        ) as CaseAction[];

        if (!actions.some((a) => a.connectorTypeId === '.case' && a.name === CASE_ACTION_NAME)) {
          await KibanaServices.get().http.post<CaseAction[]>(getCreateConnectorUrl(), {
            method: 'POST',
            body: JSON.stringify({
              connector_type_id: '.case',
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
