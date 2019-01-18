/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { pure } from 'recompose';
import styled from 'styled-components';

import {
  OnChangeDataProviderKqlQuery,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from '../events';
import { DataProvider } from './data_provider';
import { Empty } from './empty';
import { Provider } from './provider';

interface Props {
  id: string;
  dataProviders: DataProvider[];
  deleteItemAnd: (providerId: string) => void;
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
  setItemAnd: (dataprovider: DataProvider, width: number) => void;
}

const PanelProviders = styled.div`
  display: flex;
  flex-direction: row;
  min-height: 100px;
  padding: 5px 10px;
  margin-top: -10px;
`;

interface GetDraggableIdParams {
  id: string;
  dataProviderId: string;
}

export const getDraggableId = ({ id, dataProviderId }: GetDraggableIdParams): string =>
  `draggableId.timeline.${id}.dataProvider.${dataProviderId}`;

/**
 * Renders an interactive card representation of the data providers. It also
 * affords uniform UI controls for the following actions:
 * 1) removing a data provider
 * 2) temporarily disabling a data provider
 * 3) applying boolean negation to the data provider
 */
export const Providers = pure<Props>(
  ({
    id,
    dataProviders,
    deleteItemAnd,
    onChangeDataProviderKqlQuery,
    onDataProviderRemoved,
    onToggleDataProviderEnabled,
    onToggleDataProviderExcluded,
    setItemAnd,
  }: Props) => (
    <PanelProviders className="timeline-drop-area" data-test-subj="providers">
      {dataProviders.map((dataProvider, i) => (
        // Providers are a special drop target that can't be drag-and-dropped
        // to another destination, so it doesn't use our DraggableWrapper
        <Draggable
          draggableId={getDraggableId({ id, dataProviderId: dataProvider.id })}
          index={i}
          key={dataProvider.id}
        >
          {provided => (
            <div
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              ref={provided.innerRef}
              data-test-subj="providerContainer"
            >
              <Provider
                data-test-subj="provider"
                dataProvider={dataProvider}
                deleteItemAnd={deleteItemAnd}
                onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
                onDataProviderRemoved={onDataProviderRemoved}
                onToggleDataProviderEnabled={onToggleDataProviderEnabled}
                onToggleDataProviderExcluded={onToggleDataProviderExcluded}
                setItemAnd={setItemAnd}
              />
            </div>
          )}
        </Draggable>
      ))}
      <Empty shareSpace />
    </PanelProviders>
  )
);
