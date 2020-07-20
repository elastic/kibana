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
  getDocValueFields,
  getIndexFields,
  sourceQuery,
  DocValueFields,
} from '../../../../common/containers/source';
import { errorToToaster, useStateToaster } from '../../../../common/components/toasters';
import { SourceQuery } from '../../../../graphql/types';
import { useApolloClient } from '../../../../common/utils/apollo_context';

import * as i18n from './translations';

interface FetchIndexPatternReturn {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  isLoading: boolean;
  indices: string[];
  indicesExists: boolean;
  indexPatterns: IIndexPattern;
}

export type Return = [FetchIndexPatternReturn, Dispatch<SetStateAction<string[]>>];

const DEFAULT_BROWSER_FIELDS = {};
const DEFAULT_INDEX_PATTERNS = { fields: [], title: '' };
const DEFAULT_DOC_VALUE_FIELDS: DocValueFields[] = [];

export const useFetchIndexPatterns = (defaultIndices: string[] = []): Return => {
  const apolloClient = useApolloClient();
  const [indices, setIndices] = useState<string[]>(defaultIndices);

  const [state, setState] = useState<FetchIndexPatternReturn>({
    browserFields: DEFAULT_BROWSER_FIELDS,
    docValueFields: DEFAULT_DOC_VALUE_FIELDS,
    indices: defaultIndices,
    indicesExists: false,
    indexPatterns: DEFAULT_INDEX_PATTERNS,
    isLoading: false,
  });

  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    if (!deepEqual(defaultIndices, indices)) {
      setIndices(defaultIndices);
      setState((prevState) => ({ ...prevState, indices: defaultIndices }));
    }
  }, [defaultIndices, indices]);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function fetchIndexPatterns() {
      if (apolloClient && !isEmpty(indices)) {
        setState((prevState) => ({ ...prevState, isLoading: true }));
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
                setState({
                  browserFields: getBrowserFields(
                    indices.join(),
                    get('data.source.status.indexFields', result)
                  ),
                  docValueFields: getDocValueFields(
                    indices.join(),
                    get('data.source.status.indexFields', result)
                  ),
                  indices,
                  isLoading: false,
                  indicesExists: get('data.source.status.indicesExist', result),
                  indexPatterns: getIndexFields(
                    indices.join(),
                    get('data.source.status.indexFields', result)
                  ),
                });
              }
            },
            (error) => {
              if (isSubscribed) {
                setState((prevState) => ({ ...prevState, isLoading: false }));
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

  return [state, setIndices];
};
