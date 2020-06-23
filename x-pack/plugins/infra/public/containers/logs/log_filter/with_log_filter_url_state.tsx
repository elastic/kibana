/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { LogFilterState, LogFilterStateParams } from './log_filter_state';
import { replaceStateKeyInQueryString, UrlStateContainer } from '../../../utils/url_state';

type LogFilterUrlState = LogFilterStateParams['filterQueryAsKuery'];

export const WithLogFilterUrlState: React.FC = () => {
  const { filterQueryAsKuery, applyLogFilterQuery } = useContext(LogFilterState.Context);
  return (
    <UrlStateContainer
      urlState={filterQueryAsKuery}
      urlStateKey="logFilter"
      mapToUrlState={mapToFilterQuery}
      onChange={(urlState) => {
        if (urlState) {
          applyLogFilterQuery(urlState.expression);
        }
      }}
      onInitialize={(urlState) => {
        if (urlState) {
          applyLogFilterQuery(urlState.expression);
        }
      }}
    />
  );
};

const mapToFilterQuery = (value: any): LogFilterUrlState | undefined =>
  value?.kind === 'kuery' && typeof value.expression === 'string'
    ? {
        kind: value.kind,
        expression: value.expression,
      }
    : undefined;

export const replaceLogFilterInQueryString = (expression: string) =>
  replaceStateKeyInQueryString<LogFilterUrlState>('logFilter', {
    kind: 'kuery',
    expression,
  });
