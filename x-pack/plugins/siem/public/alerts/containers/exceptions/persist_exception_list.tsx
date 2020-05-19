/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, Dispatch } from 'react';

import { errorToToaster, useStateToaster } from '../../../common/components/toasters';
import { ExceptionListSchema } from '../../../../../lists/common/schemas';
import { addExceptionList as persistExceptionList } from './api';
import * as i18n from './translations';

interface PersistReturnExceptionList {
  isLoading: boolean;
  isSaved: boolean;
}

export type ReturnPersistExceptionList = [
  PersistReturnExceptionList,
  Dispatch<ExceptionListSchema | null>
];

export const usePersistExceptionList = (): ReturnPersistExceptionList => {
  const [exceptionList, setExceptionList] = useState<ExceptionListSchema | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setIsSaved(false);
    async function saveExceptionList() {
      if (exceptionList != null) {
        try {
          setIsLoading(true);
          await persistExceptionList({ list: exceptionList, signal: abortCtrl.signal });
          if (isSubscribed) {
            setIsSaved(true);
          }
        } catch (error) {
          if (isSubscribed) {
            errorToToaster({ title: i18n.EXCEPTION_LIST_ADD_FAILURE, error, dispatchToaster });
          }
        }
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    saveExceptionList();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [exceptionList]);

  return [{ isLoading, isSaved }, setExceptionList];
};
