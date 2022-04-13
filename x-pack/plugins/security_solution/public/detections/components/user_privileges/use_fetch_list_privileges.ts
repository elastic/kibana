/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useReadListPrivileges } from '@kbn/securitysolution-list-hooks';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useHttp, useKibana } from '../../../common/lib/kibana';
import { Privilege } from '../../containers/detection_engine/alerts/types';
import * as i18n from './translations';

interface ListPrivileges {
  is_authenticated: boolean;
  lists: {
    index: Privilege['index'];
  };
  listItems: {
    index: Privilege['index'];
  };
}

export const useFetchListPrivileges = (isAppAvailable: boolean = true) => {
  const http = useHttp();
  const { lists } = useKibana().services;
  const { start: fetchListPrivileges, ...listPrivileges } = useReadListPrivileges();
  const { addError } = useAppToasts();
  const abortCtrlRef = useRef(new AbortController());

  useEffect(() => {
    const { loading, result, error } = listPrivileges;

    if (isAppAvailable && lists && !loading && !(result || error)) {
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();
      fetchListPrivileges({ http, signal: abortCtrlRef.current.signal });
    }
  }, [http, lists, fetchListPrivileges, listPrivileges, isAppAvailable]);

  useEffect(() => {
    return () => {
      abortCtrlRef.current.abort();
    };
  }, []);

  useEffect(() => {
    const error = listPrivileges.error;
    if (error != null) {
      addError(error, {
        title: i18n.LISTS_PRIVILEGES_FETCH_FAILURE,
      });
    }
  }, [addError, listPrivileges.error]);

  return {
    loading: listPrivileges.loading,
    error: listPrivileges.error,
    result: listPrivileges.result as ListPrivileges | undefined,
  };
};
