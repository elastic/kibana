/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiFormHelpText } from '@elastic/eui';
import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import styled from 'styled-components';

import {
  OnChangeDataProviderKqlQuery,
  OnChangeDroppableAndProvider,
  OnDataProviderEdited,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from '../events';

import { BrowserFields } from '../../../containers/source';
import { DataProvider, IS_OPERATOR } from './data_provider';
import { Empty } from './empty';
import { ProviderItemAndDragDrop } from './provider_item_and_drag_drop';
import { ProviderItemBadge } from './provider_item_badge';
import * as i18n from './translations';

interface Props {
  browserFields: BrowserFields;
  id: string;
  dataProviders: DataProvider[];
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onChangeDroppableAndProvider: OnChangeDroppableAndProvider;
  onDataProviderEdited: OnDataProviderEdited;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
}

/**
 * This fixed height prevents the timeline's droppable area from growing,
 * (growth causes layout thrashing) when the AND drop target in a row
 * of data providers is revealed.
 */
const ROW_OF_DATA_PROVIDERS_HEIGHT = 43; // px

const PanelProviders = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  min-height: 100px;
  padding: 5px 10px 15px 0px;
  overflow-y: auto;
  align-items: stretch;
  justify-content: flex-start;
`;

PanelProviders.displayName = 'PanelProviders';

const PanelProvidersGroupContainer = styled(EuiFlexGroup)`
  position: relative;
  flex-grow: unset;

  .euiFlexItem {
    flex: 1 0 auto;
  }

  .euiFlexItem--flexGrowZero {
    flex: 0 0 auto;
  }
`;

PanelProvidersGroupContainer.displayName = 'PanelProvidersGroupContainer';

/** A row of data providers in the timeline drop zone */
const PanelProviderGroupContainer = styled(EuiFlexGroup)`
  height: ${ROW_OF_DATA_PROVIDERS_HEIGHT}px;
  min-height: ${ROW_OF_DATA_PROVIDERS_HEIGHT}px;
  margin: 5px 0px;
`;

PanelProviderGroupContainer.displayName = 'PanelProviderGroupContainer';

const PanelProviderItemContainer = styled(EuiFlexItem)`
  position: relative;
`;

PanelProviderItemContainer.displayName = 'PanelProviderItemContainer';

const TimelineEuiFormHelpText = styled(EuiFormHelpText)`
  padding-top: 0px;
  position: absolute;
  bottom: 0px;
  left: 5px;
`;

TimelineEuiFormHelpText.displayName = 'TimelineEuiFormHelpText';

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
export const Providers = React.memo<Props>(
  ({
    browserFields,
    id,
    dataProviders,
    onChangeDataProviderKqlQuery,
    onChangeDroppableAndProvider,
    onDataProviderEdited,
    onDataProviderRemoved,
    onToggleDataProviderEnabled,
    onToggleDataProviderExcluded,
  }) => (
    <PanelProviders className="timeline-drop-area" data-test-subj="providers">
      <Empty showSmallMsg={dataProviders.length > 0} />
      <PanelProvidersGroupContainer
        direction="column"
        className="provider-items-container"
        alignItems="flexStart"
        gutterSize="none"
      >
        <EuiFlexItem grow={true}>
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
              <PanelProviderGroupContainer
                key={dataProvider.id}
                direction="row"
                gutterSize="none"
                justifyContent="flexStart"
                alignItems="center"
              >
                <PanelProviderItemContainer className="provider-item-filter-container" grow={false}>
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
                          browserFields={browserFields}
                          field={
                            dataProvider.queryMatch.displayField || dataProvider.queryMatch.field
                          }
                          kqlQuery={dataProvider.kqlQuery}
                          isEnabled={dataProvider.enabled}
                          isExcluded={dataProvider.excluded}
                          deleteProvider={deleteProvider}
                          operator={dataProvider.queryMatch.operator || IS_OPERATOR}
                          onDataProviderEdited={onDataProviderEdited}
                          timelineId={id}
                          toggleEnabledProvider={toggleEnabledProvider}
                          toggleExcludedProvider={toggleExcludedProvider}
                          providerId={dataProvider.id}
                          val={
                            dataProvider.queryMatch.displayValue || dataProvider.queryMatch.value
                          }
                        />
                      </div>
                    )}
                  </Draggable>
                </PanelProviderItemContainer>
                <EuiFlexItem grow={false}>
                  <ProviderItemAndDragDrop
                    browserFields={browserFields}
                    dataProvider={dataProvider}
                    onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
                    onChangeDroppableAndProvider={onChangeDroppableAndProvider}
                    onDataProviderEdited={onDataProviderEdited}
                    onDataProviderRemoved={onDataProviderRemoved}
                    onToggleDataProviderEnabled={onToggleDataProviderEnabled}
                    onToggleDataProviderExcluded={onToggleDataProviderExcluded}
                    timelineId={id}
                  />
                </EuiFlexItem>
              </PanelProviderGroupContainer>
            );
          })}
        </EuiFlexItem>
      </PanelProvidersGroupContainer>
      <TimelineEuiFormHelpText>
        <span>
          {i18n.DROP_HERE} {i18n.TO_BUILD_AN} {i18n.OR.toLocaleUpperCase()} {i18n.QUERY}
        </span>
      </TimelineEuiFormHelpText>
    </PanelProviders>
  )
);

Providers.displayName = 'Providers';
