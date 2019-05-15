/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { AndOrBadge } from '../../and_or_badge';
import {
  OnChangeDataProviderKqlQuery,
  OnChangeDroppableAndProvider,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from '../events';

import { DataProvider } from './data_provider';
import { ProviderItemAnd } from './provider_item_and';

import * as i18n from './translations';

const DropAndTargetDataProvidersContainer = styled(EuiFlexItem)`
  margin: 0px 8px;
`;

const DropAndTargetDataProviders = styled.div<{ hasAndItem: boolean }>`
  min-width: 230px;
  width: auto;
  border: 0.1rem dashed ${props => props.theme.eui.euiColorMediumShade};
  border-radius: 5px;
  text-align: center;
  padding: 3px 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  ${props =>
    props.hasAndItem
      ? `&:hover {
    transition: background-color 0.7s ease;
    background-color: ${props.theme.eui.euiColorEmptyShade};
  }`
      : ''};
  cursor: ${({ hasAndItem }) => (!hasAndItem ? `default` : 'inherit')};
`;

const NumberProviderAndBadge = styled(EuiBadge)`
  margin: 0px 5px;
`;

interface ProviderItemDropProps {
  dataProvider: DataProvider;
  mousePosition?: { x: number; y: number; boundLeft: number; boundTop: number };
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onChangeDroppableAndProvider: OnChangeDroppableAndProvider;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
}

export const ProviderItemAndDragDrop = pure<ProviderItemDropProps>(
  ({
    dataProvider,
    onChangeDataProviderKqlQuery,
    onChangeDroppableAndProvider,
    onDataProviderRemoved,
    onToggleDataProviderEnabled,
    onToggleDataProviderExcluded,
  }) => {
    const onMouseEnter = () => onChangeDroppableAndProvider(dataProvider.id);
    const onMouseLeave = () => onChangeDroppableAndProvider('');
    const hasAndItem = dataProvider.and.length > 0;
    return (
      <EuiFlexGroup
        direction="row"
        gutterSize="none"
        justifyContent="flexStart"
        alignItems="center"
      >
        <DropAndTargetDataProvidersContainer className="drop-and-provider-timeline">
          <DropAndTargetDataProviders
            hasAndItem={hasAndItem}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            {hasAndItem && (
              <NumberProviderAndBadge color="primary">
                {dataProvider.and.length}
              </NumberProviderAndBadge>
            )}
            <EuiText color="subdued" size="xs">
              {i18n.DROP_HERE_TO_ADD_AN}
            </EuiText>
            <AndOrBadge type="and" />
          </DropAndTargetDataProviders>
        </DropAndTargetDataProvidersContainer>
        <ProviderItemAnd
          dataProvidersAnd={dataProvider.and}
          providerId={dataProvider.id}
          onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
          onDataProviderRemoved={onDataProviderRemoved}
          onToggleDataProviderEnabled={onToggleDataProviderEnabled}
          onToggleDataProviderExcluded={onToggleDataProviderExcluded}
        />
      </EuiFlexGroup>
    );
  }
);
