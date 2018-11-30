/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiPanel, EuiSpacer, EuiSwitch } from '@elastic/eui';
import * as React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { pure } from 'recompose';
import styled from 'styled-components';

import { OnDataProviderRemoved, OnToggleDataProviderEnabled } from '../events';
import { DataProvider } from './data_provider';

interface CloseButtonProps {
  onDataProviderRemoved: OnDataProviderRemoved;
  dataProvider: DataProvider;
}

/** An affordance for removing a data provider. It invokes `onDataProviderRemoved` when clicked */
const CloseButton = pure(({ onDataProviderRemoved, dataProvider }: CloseButtonProps) => {
  const onClick = () => {
    onDataProviderRemoved(dataProvider);
  };

  return (
    <EuiButtonIcon
      data-test-subj="closeButton"
      onClick={onClick}
      iconType="cross"
      aria-label="Next"
    />
  );
});

interface SwitchButtonProps {
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  dataProvider: DataProvider;
}

/** An affordance for enabling/disabling a data provider. It invokes `onToggleDataProviderEnabled` when clicked */
const SwitchButton = pure(({ onToggleDataProviderEnabled, dataProvider }: SwitchButtonProps) => {
  const onClick = () => {
    onToggleDataProviderEnabled({ dataProvider, enabled: !dataProvider.enabled });
  };

  return (
    <EuiSwitch
      aria-label="Toggle"
      data-test-subj="switchButton"
      defaultChecked={dataProvider.enabled}
      onClick={onClick}
    />
  );
});

interface Props {
  id: string;
  dataProviders: DataProvider[];
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
}

const PanelProviders = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
`;

const PanelProvider = styled(EuiPanel)`
  && {
    align-items: center;
    display: flex;
    flex-direction: row;
    margin: 5px;
    min-height: 50px;
    padding: 5px 5px 5px 10px;
    max-width: 240px;
  }
`;

const Spacer = styled(EuiSpacer)`
  margin-left: 10px;
  margin-right: 0px;
  border-left: 1px solid #ccc;
`;

const ProviderContainer = styled.div``; // required because react-beautiful-dnd cannot wrap EuiPanel directly

interface GetDraggableIdParams {
  id: string;
  dataProviderId: string;
}
export const getDraggableId = ({ id, dataProviderId }: GetDraggableIdParams): string =>
  `draggableId.timeline.${id}.dataProvider.${dataProviderId}`;

const FlexGroup = styled.span`
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-end;
  flex-grow: 1;
  align-items: center;
  margin-left: 5px;
`;

/**
 * Renders an interactive card representation of the data providers. It also
 * affords uniform UI controls for the following actions:
 * 1) removing a data provider
 * 2) temporarily disabling a data provider
 * 3) TODO: applying boolean negation to the data provider
 */
export const Providers = pure<Props>(
  ({ id, dataProviders, onDataProviderRemoved, onToggleDataProviderEnabled }: Props) => (
    <PanelProviders data-test-subj="providers">
      {dataProviders.map((dataProvider, i) => (
        // Providers are a special drop target that cant be drag-and-dropped
        // to another destination, so it doesn't use a DraggableWrapper
        <Draggable
          draggableId={getDraggableId({ id, dataProviderId: dataProvider.id })}
          index={i}
          key={dataProvider.id}
        >
          {provided => (
            <ProviderContainer
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              innerRef={provided.innerRef}
              data-test-subj="providerContainer"
            >
              <PanelProvider data-test-subj="provider" key={dataProvider.id}>
                {dataProvider.name}
                <FlexGroup>
                  <SwitchButton
                    onToggleDataProviderEnabled={onToggleDataProviderEnabled}
                    dataProvider={dataProvider}
                  />
                  <Spacer />
                  <CloseButton
                    onDataProviderRemoved={onDataProviderRemoved}
                    dataProvider={dataProvider}
                  />
                </FlexGroup>
              </PanelProvider>
            </ProviderContainer>
          )}
        </Draggable>
      ))}
    </PanelProviders>
  )
);
