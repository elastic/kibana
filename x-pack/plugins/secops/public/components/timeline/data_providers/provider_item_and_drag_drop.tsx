/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import { Theme } from '../../../store/local/app/model';
import { DroppableWrapper } from '../../drag_and_drop/droppable_wrapper';
import { droppableTimelineProvidersAndPrefix } from '../../drag_and_drop/helpers';
import {
  OnChangeDataProviderKqlQuery,
  OnChangeDroppableAndProvider,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from '../events';
import { ItemAnd } from './manage_droppale_provider_and';
import { ProviderItemAndPopover } from './provider_item_and_popover';

const DropAndTargetDataProviders = styled.div<{ width: number }>`
  height: ${({ width }) => (width ? `50px` : '0px')};
  width: ${({ width }) => (width ? `${width}px` : '0px')};
  margin-left: -5px;
`;

const AndContainer = styled.div<{ width: number }>`
  ${({ width }) => `
      width: auto;
      margin-right: ${width * 0.1 - 1.391}px;
      margin-left: ${width * 0.1 - 1.391}px;
  `}
  border: 0.1rem dashed #999999;
  border-radius: 5px;
  text-align: center;
  span.euiButtonEmpty__content {
    padding: 0px;
  }
`;

const AndStyle = styled.div`
  display: flex;
  flex-direction: row;
  align-item: center;
  justify-content: flex-start;
`;

interface ProviderItemDropProps {
  id: string;
  itemsAnd: ItemAnd[];
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onChangeDroppableAndProvider: OnChangeDroppableAndProvider;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
  theme: Theme;
}

interface GetDraggableIdParams {
  id: string;
  dataProviderId: string;
}

export const getDraggableId = ({ id, dataProviderId }: GetDraggableIdParams): string =>
  `draggableId.timeline.${id}.dataProvider.${dataProviderId}.and`;

export const ProviderItemAndDragDrop = pure<ProviderItemDropProps>(
  ({
    id,
    itemsAnd,
    onChangeDataProviderKqlQuery,
    onChangeDroppableAndProvider,
    onDataProviderRemoved,
    onToggleDataProviderEnabled,
    onToggleDataProviderExcluded,
    theme,
  }) => (
    <DropAndTargetDataProviders
      className="timeline-drop-area"
      width={itemsAnd.reduce((res, i) => res + i.width, 0)}
    >
      <DroppableWrapper droppableId={`${droppableTimelineProvidersAndPrefix}${id}`} theme={theme}>
        <AndStyle>
          {itemsAnd.map((itemAnd, i) => (
            <AndContainer
              width={itemAnd.width}
              key={`provider-${itemAnd.dataProvider.id}-and`}
              onMouseEnter={() => onChangeDroppableAndProvider(itemAnd.dataProvider.id)}
            >
              <ProviderItemAndPopover
                itemAnd={itemAnd}
                onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
                onDataProviderRemoved={onDataProviderRemoved}
                onToggleDataProviderEnabled={onToggleDataProviderEnabled}
                onToggleDataProviderExcluded={onToggleDataProviderExcluded}
                width={itemAnd.width * 0.8}
              />
            </AndContainer>
          ))}
        </AndStyle>
      </DroppableWrapper>
    </DropAndTargetDataProviders>
  )
);
