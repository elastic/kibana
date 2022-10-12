/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import React from 'react';
import { Query } from '@kbn/es-query';
import { replaceStateKeyInQueryString, UrlStateContainer } from '../../../utils/url_state';
import { useLogFilterStateContext } from './log_filter_state';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

export const WithLogFilterUrlState: React.FC = () => {
  const { filterQuery } = useLogFilterStateContext();
  const {
    data: {
      query: { queryString },
    },
  } = useKibanaContextForPlugin().services;

  return (
    <UrlStateContainer
      populateWithInitialState={true} // NOTE: Since the filterQuery is ultimately determined by the QueryString manager populate with the initial state
      urlState={filterQuery?.originalQuery}
      urlStateKey="logFilter"
      mapToUrlState={mapToFilterQuery}
      onChange={(urlState) => {
        if (urlState) {
          queryString.setQuery(urlState);
        }
      }}
      onInitialize={(urlState) => {
        if (urlState) {
          queryString.setQuery(urlState);
        }
      }}
    />
  );
};

const mapToFilterQuery = (value: any): Query | undefined => {
  if (legacyFilterQueryUrlStateRT.is(value)) {
    // migrate old url state
    return {
      language: value.kind,
      query: value.expression,
    };
  } else if (filterQueryUrlStateRT.is(value)) {
    return value;
  } else {
    return undefined;
  }
};

export const replaceLogFilterInQueryString = (query: Query) =>
  replaceStateKeyInQueryString<Query>('logFilter', query);

const filterQueryUrlStateRT = rt.type({
  language: rt.string,
  query: rt.string,
});

const legacyFilterQueryUrlStateRT = rt.type({
  kind: rt.literal('kuery'),
  expression: rt.string,
});
