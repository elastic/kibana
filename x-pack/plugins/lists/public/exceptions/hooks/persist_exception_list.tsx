/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, useEffect, useState } from 'react';

import { addExceptionList as persistExceptionList } from '../api';
import { AddExceptionList, PersistHookProps } from '../types';

interface PersistReturnExceptionList {
  isLoading: boolean;
  isSaved: boolean;
}

export type ReturnPersistExceptionList = [
  PersistReturnExceptionList,
  Dispatch<AddExceptionList | null>
];

export const usePersistExceptionList = ({
  http,
  onError,
}: PersistHookProps): ReturnPersistExceptionList => {
  const [exceptionList, setExceptionList] = useState<AddExceptionList | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setIsSaved(false);

    const saveExceptionList = async (): Promise<void> => {
      if (exceptionList != null) {
        try {
          setIsLoading(true);
          await persistExceptionList({ http, list: exceptionList, signal: abortCtrl.signal });
          if (isSubscribed) {
            setIsSaved(true);
          }
        } catch (error) {
          if (isSubscribed) {
            onError(error);
          }
        }
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    saveExceptionList();
    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [http, exceptionList, onError]);

  return [{ isLoading, isSaved }, setExceptionList];
};
