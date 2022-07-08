/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Suspense, useCallback } from 'react';
import { EuiErrorBoundary, EuiLoadingContent } from '@elastic/eui';
import { parse, stringify } from 'query-string';
import { isEqual } from 'lodash';
import { encode } from 'rison-node';
import { useHistory, useLocation } from 'react-router-dom';
import {
  Accessor,
  Dictionary,
  parseUrlState,
  Provider as UrlStateContextProvider,
  isRisonSerializationRequired,
  getNestedProperty,
  SetUrlState,
} from './hooks/url_state';

import type { ExplainLogRateSpikesProps } from './components/explain_log_rate_spikes';

const ExplainLogRateSpikesLazy = React.lazy(() => import('./components/explain_log_rate_spikes'));

const LazyWrapper: FC = ({ children }) => (
  <EuiErrorBoundary>
    <Suspense fallback={<EuiLoadingContent lines={3} />}>{children}</Suspense>
  </EuiErrorBoundary>
);

/**
 * Lazy-wrapped ExplainLogRateSpikes React component
 * @param {ExplainLogRateSpikesProps}  props - properties specifying the data on which to run the analysis.
 */
export const ExplainLogRateSpikes: FC<ExplainLogRateSpikesProps> = (props) => {
  const history = useHistory();
  const { search: urlSearchString } = useLocation();

  const setUrlState: SetUrlState = useCallback(
    (
      accessor: Accessor,
      attribute: string | Dictionary<any>,
      value?: any,
      replaceState?: boolean
    ) => {
      const prevSearchString = urlSearchString;
      const urlState = parseUrlState(prevSearchString);
      const parsedQueryString = parse(prevSearchString, { sort: false });

      if (!Object.prototype.hasOwnProperty.call(urlState, accessor)) {
        urlState[accessor] = {};
      }

      if (typeof attribute === 'string') {
        if (isEqual(getNestedProperty(urlState, `${accessor}.${attribute}`), value)) {
          return prevSearchString;
        }

        urlState[accessor][attribute] = value;
      } else {
        const attributes = attribute;
        Object.keys(attributes).forEach((a) => {
          urlState[accessor][a] = attributes[a];
        });
      }

      try {
        const oldLocationSearchString = stringify(parsedQueryString, {
          sort: false,
          encode: false,
        });

        Object.keys(urlState).forEach((a) => {
          if (isRisonSerializationRequired(a)) {
            parsedQueryString[a] = encode(urlState[a]);
          } else {
            parsedQueryString[a] = urlState[a];
          }
        });
        const newLocationSearchString = stringify(parsedQueryString, {
          sort: false,
          encode: false,
        });

        if (oldLocationSearchString !== newLocationSearchString) {
          const newSearchString = stringify(parsedQueryString, { sort: false });
          if (replaceState) {
            history.replace({ search: newSearchString });
          } else {
            history.push({ search: newSearchString });
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Could not save url state', error);
      }
    },
    [history, urlSearchString]
  );

  return (
    <LazyWrapper>
      <UrlStateContextProvider value={{ searchString: urlSearchString, setUrlState }}>
        <ExplainLogRateSpikesLazy {...props} />{' '}
      </UrlStateContextProvider>
    </LazyWrapper>
  );
};
