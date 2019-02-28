/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { DroppableWrapper } from '../../drag_and_drop/droppable_wrapper';
import { droppableTimelineProvidersPrefix } from '../../drag_and_drop/helpers';
import {
  OnChangeDataProviderKqlQuery,
  OnChangeDroppableAndProvider,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from '../events';

import { DataProvider } from './data_provider';
import { Empty } from './empty';
import { Providers } from './providers';

interface Props {
  id: string;
  dataProviders: DataProvider[];
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onChangeDroppableAndProvider: OnChangeDroppableAndProvider;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
  show: boolean;
}

const DropTargetDataProviders = styled.div`
  position: relative;
  border: 0.2rem dashed ${props => props.theme.eui.euiColorMediumShade};
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 5px 0 5px 0;
  min-height: 100px;
  overflow-y: auto;
  background-color: ${props => props.theme.eui.euiFormBackgroundColor};
`;

const getDroppableId = (id: string): string => `${droppableTimelineProvidersPrefix}${id}`;

/**
 * Renders the data providers section of the timeline.
 *
 * The data providers section is a drop target where users
 * can drag-and drop new data providers into the timeline.
 *
 * It renders an interactive card representation of the
 * data providers. It also provides uniform
 * UI controls for the following actions:
 * 1) removing a data provider
 * 2) temporarily disabling a data provider
 * 3) applying boolean negation to the data provider
 *
 * Given an empty collection of DataProvider[], it prompts
 * the user to drop anything with a facet count into
 * the data pro section.
 */
export const DataProviders = pure<Props>(
  ({
    id,
    dataProviders,
    onChangeDataProviderKqlQuery,
    onChangeDroppableAndProvider,
    onDataProviderRemoved,
    onToggleDataProviderEnabled,
    onToggleDataProviderExcluded,
    show,
  }) => (
    <DropTargetDataProviders data-test-subj="dataProviders">
      <DroppableWrapper isDropDisabled={!show} droppableId={getDroppableId(id)}>
        {dataProviders.length ? (
          <Providers
            id={id}
            dataProviders={dataProviders}
            onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
            onChangeDroppableAndProvider={onChangeDroppableAndProvider}
            onDataProviderRemoved={onDataProviderRemoved}
            onToggleDataProviderEnabled={onToggleDataProviderEnabled}
            onToggleDataProviderExcluded={onToggleDataProviderExcluded}
          />
        ) : (
          <Empty />
        )}
      </DroppableWrapper>
    </DropTargetDataProviders>
  )
);
