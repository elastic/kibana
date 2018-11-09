/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import { pure } from 'recompose';
import styled from 'styled-components';

import { OnDataProviderRemoved } from '../events';
import { DataProvider } from './data_provider';
import { Empty } from './empty';
import { Providers } from './providers';

interface Props {
  id: string;
  dataProviders: DataProvider[];
  onDataProviderRemoved: OnDataProviderRemoved;
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

const ReactDndDropTarget = styled.div<{ isDraggingOver: boolean }>`
  transition: background-color 0.7s ease;
  background-color: ${props =>
    props.isDraggingOver ? '#D9D9D9' : props.theme.eui.euiColorEmptyShade};
  min-height: 100px;
`;

const getDroppableId = (id: string): string => `droppableId.timelineProviders.${id}`;

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
export const DataProviders = pure<Props>(({ id, dataProviders, onDataProviderRemoved }) => (
  <DropTargetDataProviders data-test-subj="dataProviders">
    <Droppable droppableId={getDroppableId(id)}>
      {(provided, snapshot) => (
        <ReactDndDropTarget
          innerRef={provided.innerRef}
          {...provided.droppableProps}
          isDraggingOver={snapshot.isDraggingOver}
        >
          {dataProviders.length ? (
            <Providers
              id={id}
              dataProviders={dataProviders}
              onDataProviderRemoved={onDataProviderRemoved}
            />
          ) : (
            <Empty />
          )}
        </ReactDndDropTarget>
      )}
    </Droppable>
  </DropTargetDataProviders>
));
