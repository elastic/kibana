/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, Dispatch } from 'react';

import { errorToToaster, useStateToaster } from '../../../common/components/toasters';
import { ExceptionListItemSchema } from '../../../../../lists/common/schemas';
import { addExceptionListItem as persistExceptionItem } from './api';
import * as i18n from './translations';

interface PersistReturnExceptionItem {
  isLoading: boolean;
  isSaved: boolean;
}

export type ReturnPersistExceptionItem = [
  PersistReturnExceptionItem,
  Dispatch<ExceptionListItemSchema | null>
];

export const usePersistExceptionItem = (): ReturnPersistExceptionItem => {
  const [exceptionListItem, setExceptionItem] = useState<ExceptionListItemSchema | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setIsSaved(false);
    async function saveExceptionItem() {
      if (exceptionListItem != null) {
        try {
          setIsLoading(true);
          await persistExceptionItem({ listItem: exceptionListItem, signal: abortCtrl.signal });
          if (isSubscribed) {
            setIsSaved(true);
          }
        } catch (error) {
          if (isSubscribed) {
            errorToToaster({ title: i18n.EXCEPTION_LIST_ITEM_ADD_FAILURE, error, dispatchToaster });
          }
        }
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    saveExceptionItem();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [exceptionListItem]);

  return [{ isLoading, isSaved }, setExceptionItem];
};
