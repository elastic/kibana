/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
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
import { ProviderItemAndPopover } from './provider_item_and_popover';

const DropAndTargetDataProviders = styled.div<{ hasAndItem: boolean }>`
  border: 0.1rem dashed ${props => props.theme.eui.euiColorMediumShade};
  border-radius: 5px;
  text-align: center;
  padding: 2px 3px;
  ${props =>
    props.hasAndItem
      ? `&:hover {
    transition: background-color 0.7s ease;
    background-color: ${props.theme.eui.euiColorDarkestShade};
  }`
      : ''};
  cursor: ${({ hasAndItem }) => (!hasAndItem ? `default` : 'inherit')};
  .euiPopover {
    display: inherit;
    .euiPopover__anchor {
      display: inherit;
      .euiButtonEmpty {
        width: 100%;
        .euiButtonEmpty__content {
          padding: 0px;
        }
      }
    }
  }
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

    return (
      <DropAndTargetDataProviders
        className="drop-and-provider-timeline"
        hasAndItem={dataProvider.and.length > 0}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <ProviderItemAndPopover
          dataProvidersAnd={dataProvider.and}
          providerId={dataProvider.id}
          onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
          onDataProviderRemoved={onDataProviderRemoved}
          onToggleDataProviderEnabled={onToggleDataProviderEnabled}
          onToggleDataProviderExcluded={onToggleDataProviderExcluded}
        />
      </DropAndTargetDataProviders>
    );
  }
);
