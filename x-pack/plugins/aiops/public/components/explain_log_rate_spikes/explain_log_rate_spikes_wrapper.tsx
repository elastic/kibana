/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
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
} from '../../hooks/url_state';

import { ExplainLogRateSpikes, ExplainLogRateSpikesProps } from './explain_log_rate_spikes';

export const ExplainLogRateSpikesWrapper: FC<ExplainLogRateSpikesProps> = (props) => {
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
    <UrlStateContextProvider value={{ searchString: urlSearchString, setUrlState }}>
      <ExplainLogRateSpikes {...props} />{' '}
    </UrlStateContextProvider>
  );
};
