/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { useKibana } from '../lib/kibana';
import { errorToToaster, useStateToaster } from '../components/toasters';

import * as i18n from './translations';
import { IndexPatternSavedObject } from './types';
import { getIndexPatterns } from './api/api';

type Return = [boolean, IndexPatternSavedObject[]];

export const useIndexPatterns = (refreshToggle = false): Return => {
  const [indexPatterns, setIndexPatterns] = useState<IndexPatternSavedObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, dispatchToaster] = useStateToaster();
  const { savedObjects } = useKibana().services;

  useEffect(() => {
    let isSubscribed = true;
    setIsLoading(true);

    async function fetchIndexPatterns() {
      try {
        const data = await getIndexPatterns(savedObjects);

        if (isSubscribed) {
          setIndexPatterns(data);
          setIsLoading(false);
        }
      } catch (error) {
        if (isSubscribed) {
          errorToToaster({ title: i18n.INDEX_PATTERN_FETCH_FAILURE, error, dispatchToaster });
          setIsLoading(false);
        }
      }
    }

    fetchIndexPatterns();
    return () => {
      isSubscribed = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToggle]);

  return [isLoading, indexPatterns];
};
