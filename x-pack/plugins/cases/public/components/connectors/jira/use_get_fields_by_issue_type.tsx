/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useRef } from 'react';
import { HttpSetup, IToasts } from '@kbn/core/public';
import { ActionConnector } from '../../../../common/api';
import { getFieldsByIssueType } from './api';
import { Fields } from './types';
import * as i18n from './translations';

interface Props {
  http: HttpSetup;
  toastNotifications: IToasts;
  issueType: string | null;
  connector?: ActionConnector;
}

export interface UseGetFieldsByIssueType {
  fields: Fields;
  isLoading: boolean;
}

export const useGetFieldsByIssueType = ({
  http,
  toastNotifications,
  connector,
  issueType,
}: Props): UseGetFieldsByIssueType => {
  const [isLoading, setIsLoading] = useState(true);
  const [fields, setFields] = useState<Fields>({});
  const didCancel = useRef(false);
  const abortCtrl = useRef(new AbortController());

  useEffect(() => {
    const fetchData = async () => {
      if (!connector || !issueType) {
        setIsLoading(false);
        return;
      }

      try {
        abortCtrl.current = new AbortController();
        setIsLoading(true);

        const res = await getFieldsByIssueType({
          http,
          signal: abortCtrl.current.signal,
          connectorId: connector.id,
          id: issueType,
        });

        if (!didCancel.current) {
          setFields(res.data ?? {});
          setIsLoading(false);
          if (res.status && res.status === 'error') {
            toastNotifications.addDanger({
              title: i18n.FIELDS_API_ERROR,
              text: `${res.serviceMessage ?? res.message}`,
            });
          }
        }
      } catch (error) {
        if (!didCancel.current) {
          setIsLoading(false);
          if (error.name !== 'AbortError') {
            toastNotifications.addDanger({
              title: i18n.FIELDS_API_ERROR,
              text: error.message,
            });
          }
        }
      }
    };

    didCancel.current = false;
    abortCtrl.current.abort();
    fetchData();

    return () => {
      didCancel.current = true;
      abortCtrl.current.abort();
    };
  }, [http, connector, issueType, toastNotifications]);

  return {
    isLoading,
    fields,
  };
};
