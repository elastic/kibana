/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
  EuiPopoverProps,
} from '@elastic/eui';
import React, { FunctionComponent } from 'react';
import styled from 'styled-components';

import { TimelineType } from '../../../../../common/types/timeline';
import { BrowserFields } from '../../../../common/containers/source';

import { OnDataProviderEdited } from '../events';
import { DataProviderType, QueryOperator, EXISTS_OPERATOR } from './data_provider';
import { StatefulEditDataProvider } from '../../edit_data_provider';

import * as i18n from './translations';

export const EDIT_CLASS_NAME = 'edit-data-provider';
export const EXCLUDE_CLASS_NAME = 'exclude-data-provider';
export const ENABLE_CLASS_NAME = 'enable-data-provider';
export const FILTER_FOR_FIELD_PRESENT_CLASS_NAME = 'filter-for-field-present-data-provider';
export const CONVERT_TO_FIELD_CLASS_NAME = 'convert-to-field-data-provider';
export const DELETE_CLASS_NAME = 'delete-data-provider';

interface OwnProps {
  andProviderId?: string;
  browserFields?: BrowserFields;
  button: JSX.Element;
  closePopover: () => void;
  deleteProvider: () => void;
  field: string;
  kqlQuery: string;
  isEnabled: boolean;
  isExcluded: boolean;
  isLoading: boolean;
  isOpen: boolean;
  onDataProviderEdited?: OnDataProviderEdited;
  operator: QueryOperator;
  providerId: string;
  timelineId?: string;
  timelineType?: TimelineType;
  toggleEnabledProvider: () => void;
  toggleExcludedProvider: () => void;
  toggleTypeProvider: () => void;
  value: string | number;
  type: DataProviderType;
}

const MyEuiPopover = styled((EuiPopover as unknown) as FunctionComponent)<
  EuiPopoverProps & {
    id?: string;
  }
>`
  height: 100%;
  user-select: none;
`;

MyEuiPopover.displayName = 'MyEuiPopover';

interface GetProviderActionsProps {
  andProviderId?: string;
  browserFields?: BrowserFields;
  deleteItem: () => void;
  field: string;
  isEnabled: boolean;
  isExcluded: boolean;
  isLoading: boolean;
  onDataProviderEdited?: OnDataProviderEdited;
  onFilterForFieldPresent: () => void;
  operator: QueryOperator;
  providerId: string;
  timelineId?: string;
  timelineType?: TimelineType;
  toggleEnabled: () => void;
  toggleExcluded: () => void;
  toggleType: () => void;
  value: string | number;
  type: DataProviderType;
}

export const getProviderActions = ({
  andProviderId,
  browserFields,
  deleteItem,
  field,
  isEnabled,
  isExcluded,
  isLoading,
  operator,
  onDataProviderEdited,
  onFilterForFieldPresent,
  providerId,
  timelineId,
  timelineType,
  toggleEnabled,
  toggleExcluded,
  toggleType,
  type,
  value,
}: GetProviderActionsProps): EuiContextMenuPanelDescriptor[] => [
  {
    id: 0,
    items: [
      {
        className: EDIT_CLASS_NAME,
        disabled: isLoading,
        icon: 'pencil',
        name: i18n.EDIT_MENU_ITEM,
        panel: 1,
      },
      {
        className: EXCLUDE_CLASS_NAME,
        disabled: isLoading,
        icon: `${isExcluded ? 'plusInCircle' : 'minusInCircle'}`,
        name: isExcluded ? i18n.INCLUDE_DATA_PROVIDER : i18n.EXCLUDE_DATA_PROVIDER,
        onClick: toggleExcluded,
      },
      {
        className: ENABLE_CLASS_NAME,
        disabled: isLoading,
        icon: `${isEnabled ? 'eyeClosed' : 'eye'}`,
        name: isEnabled ? i18n.TEMPORARILY_DISABLE_DATA_PROVIDER : i18n.RE_ENABLE_DATA_PROVIDER,
        onClick: toggleEnabled,
      },
      {
        className: FILTER_FOR_FIELD_PRESENT_CLASS_NAME,
        disabled: isLoading,
        icon: 'logstashFilter',
        name: i18n.FILTER_FOR_FIELD_PRESENT,
        onClick: onFilterForFieldPresent,
      },
      timelineType === TimelineType.template
        ? {
            className: CONVERT_TO_FIELD_CLASS_NAME,
            disabled: isLoading,
            icon: 'visText',
            name:
              type === DataProviderType.template
                ? i18n.CONVERT_TO_FIELD
                : i18n.CONVERT_TO_TEMPLATE_FIELD,
            onClick: toggleType,
          }
        : { name: null },
      {
        className: DELETE_CLASS_NAME,
        disabled: isLoading,
        icon: 'trash',
        name: i18n.DELETE_DATA_PROVIDER,
        onClick: deleteItem,
      },
    ].filter((item) => item.name != null),
  },
  {
    content:
      browserFields != null && timelineId != null && onDataProviderEdited != null ? (
        <StatefulEditDataProvider
          andProviderId={andProviderId}
          browserFields={browserFields}
          field={field}
          isExcluded={isExcluded}
          onDataProviderEdited={onDataProviderEdited}
          operator={operator}
          providerId={providerId}
          timelineId={timelineId}
          value={value}
          type={type}
        />
      ) : null,
    id: 1,
    title: i18n.EDIT_TITLE,
    width: 400,
  },
];

export class ProviderItemActions extends React.PureComponent<OwnProps> {
  public render() {
    const {
      andProviderId,
      browserFields,
      button,
      closePopover,
      deleteProvider,
      field,
      isEnabled,
      isExcluded,
      isLoading,
      isOpen,
      operator,
      providerId,
      timelineId,
      timelineType,
      toggleEnabledProvider,
      toggleExcludedProvider,
      toggleTypeProvider,
      value,
      type,
    } = this.props;

    const panelTree = getProviderActions({
      andProviderId,
      browserFields,
      deleteItem: deleteProvider,
      field,
      isEnabled,
      isExcluded,
      isLoading,
      onDataProviderEdited: this.onDataProviderEdited,
      onFilterForFieldPresent: this.onFilterForFieldPresent,
      operator,
      providerId,
      timelineId,
      timelineType,
      toggleEnabled: toggleEnabledProvider,
      toggleExcluded: toggleExcludedProvider,
      toggleType: toggleTypeProvider,
      value,
      type,
    });

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

  private onDataProviderEdited: OnDataProviderEdited = ({
    andProviderId,
    excluded,
    field,
    id,
    operator,
    providerId,
    value,
    type,
  }) => {
    if (this.props.onDataProviderEdited != null) {
      this.props.onDataProviderEdited({
        andProviderId,
        excluded,
        field,
        id,
        operator,
        providerId,
        value,
        type,
      });
    }

    this.props.closePopover();
  };

  private onFilterForFieldPresent = () => {
    const { andProviderId, field, timelineId, providerId, value, type } = this.props;

    if (this.props.onDataProviderEdited != null) {
      this.props.onDataProviderEdited({
        andProviderId,
        excluded: false,
        field,
        id: `${timelineId}`,
        operator: EXISTS_OPERATOR,
        providerId,
        value,
        type,
      });
    }

    this.props.closePopover();
  };
}
