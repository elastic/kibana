/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  // @ts-ignore
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
} from '@elastic/eui';
import * as React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { pure } from 'recompose';
import styled from 'styled-components';

import {
  OnChangeDataProviderKqlQuery,
  OnChangeDroppableAndProvider,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from '../events';
import { DataProvider } from './data_provider';
import { Empty } from './empty';
import { ProviderItemAndDragDrop } from './provider_item_and_drag_drop';
import { ProviderItemBadge } from './provider_item_badge';
import * as i18n from './translations';

interface Props {
  id: string;
  dataProviders: DataProvider[];
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onChangeDroppableAndProvider: OnChangeDroppableAndProvider;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
}

const PanelProviders = styled.div`
  display: flex;
  flex-direction: row;
  min-height: 100px;
  padding: 10px;
  overflow-y: auto;
`;

const EuiBadgeOrStyled = styled(EuiBadge)`
  position: absolute;
  right: -37px;
  top: 27px;
  z-index: 1;
  width: 20px;
  height: 20px;
  padding: 7px 6px 4px 6px;
  border-radius: 100%;
`;

const PanelProvidersGroupContainer = styled(EuiFlexGroup)`
  position: relative;
  flex-grow: unset;
  margin-right: 40px;
`;

const PanelProviderItemContainer = styled(EuiFlexItem)`
  height: 100%;
  .euiHorizontalRule {
    transform: rotate(90deg);
    position: absolute;
    top: 23px;
    width: 80px;
    right: -60px;
  }
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
    onChangeDataProviderKqlQuery,
    onChangeDroppableAndProvider,
    onDataProviderRemoved,
    onToggleDataProviderEnabled,
    onToggleDataProviderExcluded,
  }) => (
    <PanelProviders className="timeline-drop-area" data-test-subj="providers">
      {dataProviders.map((dataProvider, i) => {
        const deleteProvider = () => onDataProviderRemoved(dataProvider.id);
        const toggleEnabledProvider = () =>
          onToggleDataProviderEnabled({
            providerId: dataProvider.id,
            enabled: !dataProvider.enabled,
          });
        const toggleExcludedProvider = () =>
          onToggleDataProviderExcluded({
            providerId: dataProvider.id,
            excluded: !dataProvider.excluded,
          });
        return (
          // Providers are a special drop target that can't be drag-and-dropped
          // to another destination, so it doesn't use our DraggableWrapper
          <PanelProvidersGroupContainer
            key={dataProvider.id}
            direction="row"
            className="provider-item-container"
            alignItems="center"
            gutterSize="none"
          >
            <PanelProviderItemContainer grow={false}>
              <EuiFlexGroup direction="column" gutterSize="none" justifyContent="spaceAround">
                <EuiFlexItem className="provider-item-filter-container" grow={false}>
                  <Draggable
                    draggableId={getDraggableId({ id, dataProviderId: dataProvider.id })}
                    index={i}
                  >
                    {provided => (
                      <div
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        ref={provided.innerRef}
                        data-test-subj="providerContainer"
                      >
                        <ProviderItemBadge
                          field={
                            dataProvider.queryMatch.displayField || dataProvider.queryMatch.field
                          }
                          kqlQuery={dataProvider.kqlQuery}
                          isEnabled={dataProvider.enabled}
                          isExcluded={dataProvider.excluded}
                          deleteProvider={deleteProvider}
                          toggleEnabledProvider={toggleEnabledProvider}
                          toggleExcludedProvider={toggleExcludedProvider}
                          providerId={dataProvider.id}
                          queryDate={dataProvider.queryDate}
                          val={
                            dataProvider.queryMatch.displayValue || dataProvider.queryMatch.value
                          }
                        />
                      </div>
                    )}
                  </Draggable>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ProviderItemAndDragDrop
                    dataProvider={dataProvider}
                    onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
                    onChangeDroppableAndProvider={onChangeDroppableAndProvider}
                    onDataProviderRemoved={onDataProviderRemoved}
                    onToggleDataProviderEnabled={onToggleDataProviderEnabled}
                    onToggleDataProviderExcluded={onToggleDataProviderExcluded}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </PanelProviderItemContainer>
            <PanelProviderItemContainer grow={false}>
              <EuiBadgeOrStyled color="hollow">{i18n.OR.toLocaleUpperCase()}</EuiBadgeOrStyled>
              <EuiHorizontalRule />
            </PanelProviderItemContainer>
          </PanelProvidersGroupContainer>
        );
      })}
      <Empty />
    </PanelProviders>
  )
);
