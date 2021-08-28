/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useRef, useState } from 'react';
import type { HttpSetup } from '../../../../../../../../src/core/public/http/types';
import { ToastsApi } from '../../../../../../../../src/core/public/notifications/toasts/toasts_api';
import type { ActionConnector } from '../../../../types';
import { getFieldsByIssueType } from './api';
import * as i18n from './translations';

interface Fields {
  [key: string]: {
    allowedValues: Array<{ name: string; id: string }> | [];
    defaultValue: { name: string; id: string } | {};
  };
}

interface Props {
  http: HttpSetup;
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  issueType: string | undefined;
  actionConnector?: ActionConnector;
}

export interface UseGetFieldsByIssueType {
  fields: Fields;
  isLoading: boolean;
}

export const useGetFieldsByIssueType = ({
  http,
  toastNotifications,
  actionConnector,
  issueType,
}: Props): UseGetFieldsByIssueType => {
  const [isLoading, setIsLoading] = useState(true);
  const [fields, setFields] = useState<Fields>({});
  const abortCtrl = useRef(new AbortController());

  useEffect(() => {
    let didCancel = false;
    const fetchData = async () => {
      if (!actionConnector || !issueType) {
        setIsLoading(false);
        return;
      }

      abortCtrl.current = new AbortController();
      setIsLoading(true);
      try {
        const res = await getFieldsByIssueType({
          http,
          signal: abortCtrl.current.signal,
          connectorId: actionConnector.id,
          id: issueType,
        });

        if (!didCancel) {
          setIsLoading(false);
          setFields(res.data ?? {});
          if (res.status && res.status === 'error') {
            toastNotifications.addDanger({
              title: i18n.FIELDS_API_ERROR,
              text: `${res.serviceMessage ?? res.message}`,
            });
          }
        }
      } catch (error) {
        if (!didCancel) {
          setIsLoading(false);
          toastNotifications.addDanger({
            title: i18n.FIELDS_API_ERROR,
            text: error.message,
          });
        }
      }
    };

    abortCtrl.current.abort();
    fetchData();

    return () => {
      didCancel = true;
      setIsLoading(false);
      abortCtrl.current.abort();
    };
  }, [http, actionConnector, issueType, toastNotifications]);

  return {
    isLoading,
    fields,
  };
};
