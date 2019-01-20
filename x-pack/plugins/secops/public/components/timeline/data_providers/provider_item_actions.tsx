/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  // @ts-ignore
  EuiContextMenu,
  EuiPopover,
} from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

interface OwnProps {
  button: JSX.Element;
  closePopover: () => void;
  deleteProvider: () => void;
  field: string;
  kqlQuery: string;
  isEnabled: boolean;
  isExcluded: boolean;
  isOpen: boolean;
  providerId: string;
  toggleEnabledProvider: () => void;
  toggleExcludedProvider: () => void;
  value: string | number;
}

const MyEuiPopover = styled(EuiPopover)`
  height: 100%;
`;

export const getProviderActions = (
  deleteItem: () => void,
  isEnabled: boolean,
  isExcluded: boolean,
  toggleEnabled: () => void,
  toggleExcluded: () => void
) => [
  {
    id: 0,
    items: [
      // {
      //   name: 'Edit filter query',
      //   icon: 'pencil',
      //   panel: 1,
      // },
      {
        name: `${isExcluded ? 'Include results' : 'Exclude results'}`,
        icon: `${isExcluded ? 'plusInCircle' : 'minusInCircle'}`,
        onClick: toggleExcluded,
      },
      {
        name: `${isEnabled ? 'Temporarily disable' : 'Re-enable'}`,
        icon: `${isEnabled ? 'eyeClosed' : 'eye'}`,
        onClick: toggleEnabled,
      },
      {
        name: 'Delete',
        icon: 'trash',
        onClick: deleteItem,
      },
    ],
  },
  // {
  //   id: 1,
  //   width: 400,
  //   content: <div style={{ padding: 16 }}>ADD KQL BAR</div>,
  // },
];

export const ProviderItemActions = pure<OwnProps>(
  ({
    button,
    closePopover,
    deleteProvider,
    kqlQuery,
    field,
    isEnabled,
    isExcluded,
    isOpen,
    providerId,
    toggleEnabledProvider,
    toggleExcludedProvider,
    value,
  }) => {
    const panelTree = getProviderActions(
      deleteProvider,
      isEnabled,
      isExcluded,
      toggleEnabledProvider,
      toggleExcludedProvider
    );
    return (
      <MyEuiPopover
        id={`popoverFor_${providerId}-${field}-${value}`}
        isOpen={isOpen}
        closePopover={closePopover}
        button={button}
        anchorPosition="downCenter"
        panelPaddingSize="none"
      >
        <EuiContextMenu initialPanelId={0} panels={panelTree} />
      </MyEuiPopover>
    );
  }
);
