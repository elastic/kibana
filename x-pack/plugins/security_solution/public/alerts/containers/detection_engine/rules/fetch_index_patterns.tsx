/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, get } from 'lodash/fp';
import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import deepEqual from 'fast-deep-equal';

import { IIndexPattern } from '../../../../../../../../src/plugins/data/public';
import {
  BrowserFields,
  getBrowserFields,
  getIndexFields,
  sourceQuery,
} from '../../../../common/containers/source';
import { errorToToaster, useStateToaster } from '../../../../common/components/toasters';
import { SourceQuery } from '../../../../graphql/types';
import { useApolloClient } from '../../../../common/utils/apollo_context';

import * as i18n from './translations';

interface FetchIndexPatternReturn {
  browserFields: BrowserFields;
  isLoading: boolean;
  indices: string[];
  indicesExists: boolean;
  indexPatterns: IIndexPattern;
}

export type Return = [FetchIndexPatternReturn, Dispatch<SetStateAction<string[]>>];

export const useFetchIndexPatterns = (defaultIndices: string[] = []): Return => {
  const apolloClient = useApolloClient();
  const [indices, setIndices] = useState<string[]>(defaultIndices);
  const [indicesExists, setIndicesExists] = useState(false);
  const [indexPatterns, setIndexPatterns] = useState<IIndexPattern>({ fields: [], title: '' });
  const [browserFields, setBrowserFields] = useState<BrowserFields>({});
  const [isLoading, setIsLoading] = useState(false);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    if (!deepEqual(defaultIndices, indices)) {
      setIndices(defaultIndices);
    }
  }, [defaultIndices, indices]);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function fetchIndexPatterns() {
      if (apolloClient && !isEmpty(indices)) {
        setIsLoading(true);
        apolloClient
          .query<SourceQuery.Query, SourceQuery.Variables>({
            query: sourceQuery,
            fetchPolicy: 'cache-first',
            variables: {
              sourceId: 'default',
              defaultIndex: indices,
            },
            context: {
              fetchOptions: {
                signal: abortCtrl.signal,
              },
            },
          })
          .then(
            (result) => {
              if (isSubscribed) {
                setIsLoading(false);
                setIndicesExists(get('data.source.status.indicesExist', result));
                setIndexPatterns(
                  getIndexFields(indices.join(), get('data.source.status.indexFields', result))
                );
                setBrowserFields(
                  getBrowserFields(indices.join(), get('data.source.status.indexFields', result))
                );
              }
            },
            (error) => {
              if (isSubscribed) {
                setIsLoading(false);
                errorToToaster({ title: i18n.RULE_ADD_FAILURE, error, dispatchToaster });
              }
            }
          );
      }
    }
    fetchIndexPatterns();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indices]);

  return [{ browserFields, isLoading, indices, indicesExists, indexPatterns }, setIndices];
};
