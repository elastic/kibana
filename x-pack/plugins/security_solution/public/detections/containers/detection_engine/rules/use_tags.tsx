/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import { useEffect, useState, useRef } from 'react';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { fetchTags } from './api';
import * as i18n from './translations';

export type ReturnTags = [boolean, string[], () => void];

/**
 * Hook for using the list of Tags from the Detection Engine API
 *
 */
export const useTags = (): ReturnTags => {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const reFetchTags = useRef<() => void>(noop);
  const { addError } = useAppToasts();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      try {
        const fetchTagsResult = await fetchTags({
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          setTags(fetchTagsResult);
        }
      } catch (error) {
        if (isSubscribed) {
          addError(error, { title: i18n.TAG_FETCH_FAILURE });
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    };

    fetchData();
    reFetchTags.current = fetchData;

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [addError]);

  return [loading, tags, reFetchTags.current];
};
