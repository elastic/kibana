/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import { StaticIndexPattern } from 'ui/index_patterns';

import { Sort } from '../body/sort';
import { DataProviders } from '../data_providers';
import { DataProvider } from '../data_providers/data_provider';
import {
  OnChangeDataProviderKqlQuery,
  OnChangeDroppableAndProvider,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from '../events';
import { StatefulSearchOrFilter } from '../search_or_filter';

interface Props {
  id: string;
  indexPattern: StaticIndexPattern;
  dataProviders: DataProvider[];
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onChangeDroppableAndProvider: OnChangeDroppableAndProvider;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
  show: boolean;
  sort: Sort;
}

const TimelineHeaderContainer = styled.div`
  width: 100%;
`;

export const TimelineHeader = pure<Props>(
  ({
    id,
    indexPattern,
    dataProviders,
    onChangeDataProviderKqlQuery,
    onChangeDroppableAndProvider,
    onDataProviderRemoved,
    onToggleDataProviderEnabled,
    onToggleDataProviderExcluded,
    show,
  }) => (
    <TimelineHeaderContainer data-test-subj="timelineHeader">
      <DataProviders
        id={id}
        dataProviders={dataProviders}
        onChangeDroppableAndProvider={onChangeDroppableAndProvider}
        onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
        onDataProviderRemoved={onDataProviderRemoved}
        onToggleDataProviderEnabled={onToggleDataProviderEnabled}
        onToggleDataProviderExcluded={onToggleDataProviderExcluded}
        show={show}
      />
      <StatefulSearchOrFilter timelineId={id} indexPattern={indexPattern} />
    </TimelineHeaderContainer>
  )
);
