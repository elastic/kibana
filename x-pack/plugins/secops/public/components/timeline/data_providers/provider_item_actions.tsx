/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiContextMenu, EuiPopover } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import * as i18n from './translations';

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
  user-select: none;
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
        name: isExcluded ? i18n.INCLUDE_DATA_PROVIDER : i18n.EXCLUDE_DATA_PROVIDER,
        icon: `${isExcluded ? 'plusInCircle' : 'minusInCircle'}`,
        onClick: toggleExcluded,
      },
      {
        name: isEnabled ? i18n.TEMPORARILY_DISABLE_DATA_PROVIDER : i18n.RE_ENABLE_DATA_PROVIDER,
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
        <div style={{ userSelect: 'none' }}>
          <EuiContextMenu initialPanelId={0} panels={panelTree} data-test-subj="providerActions" />
        </div>
      </MyEuiPopover>
    );
  }
);
