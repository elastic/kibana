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
import { OnDataProviderRemoved, OnToggleDataProviderEnabled } from '../events';
import { DataProvider } from './data_provider';
import { Empty } from './empty';
import { Providers } from './providers';

interface Props {
  id: string;
  dataProviders: DataProvider[];
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
}

const DropTargetDataProviders = styled.div`
  border: 0.3rem dashed #999999;
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 5px;
  min-height: 100px;
  padding: 5px;
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
  ({ id, dataProviders, onDataProviderRemoved, onToggleDataProviderEnabled }: Props) => (
    <DropTargetDataProviders data-test-subj="dataProviders">
      <DroppableWrapper droppableId={getDroppableId(id)}>
        {dataProviders.length ? (
          <Providers
            id={id}
            dataProviders={dataProviders}
            onDataProviderRemoved={onDataProviderRemoved}
            onToggleDataProviderEnabled={onToggleDataProviderEnabled}
          />
        ) : (
          <Empty />
        )}
      </DroppableWrapper>
    </DropTargetDataProviders>
  )
);
