/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiBasicTableColumn, EuiToolTip } from '@elastic/eui';

import type { NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { FormatUrl } from '../../../../../../common/components/link_to';
import * as i18n from './translations';
import { ExceptionListInfo } from './use_all_exception_lists';
import { ExceptionOverflowDisplay } from './exceptions_overflow_display';
import { ExceptionsTableItem } from './types';

export type AllExceptionListsColumns = EuiBasicTableColumn<ExceptionsTableItem>;

export const getAllExceptionListsColumns = (
  onExport: (arg: { id: string; listId: string; namespaceType: NamespaceType }) => () => void,
  onDelete: (arg: { id: string; listId: string; namespaceType: NamespaceType }) => () => void,
  formatUrl: FormatUrl,
  navigateToUrl: (url: string) => Promise<void>
): AllExceptionListsColumns[] => [
  {
    align: 'left',
    field: 'list_id',
    name: i18n.EXCEPTION_LIST_ID_TITLE,
    truncateText: true,
    dataType: 'string',
    width: '15%',
    render: (value: ExceptionListInfo['list_id']) => (
      <EuiToolTip position="left" content={value}>
        <p data-test-subj="exceptionsTableListId">{value}</p>
      </EuiToolTip>
    ),
  },
  {
    align: 'left',
    field: 'name',
    name: i18n.EXCEPTION_LIST_NAME,
    truncateText: true,
    dataType: 'string',
    width: '10%',
    render: (value: ExceptionListInfo['name']) => (
      <EuiToolTip position="left" content={value}>
        <p data-test-subj="exceptionsTableName">{value}</p>
      </EuiToolTip>
    ),
  },
  {
    align: 'center',
    field: 'rules',
    name: i18n.NUMBER_RULES_ASSIGNED_TO_TITLE,
    truncateText: true,
    dataType: 'number',
    width: '10%',
    render: (value: ExceptionListInfo['rules']) => {
      return <p>{value.length}</p>;
    },
  },
  {
    align: 'left',
    field: 'rules',
    name: i18n.RULES_ASSIGNED_TO_TITLE,
    truncateText: true,
    dataType: 'string',
    width: '20%',
    render: (value: ExceptionListInfo['rules']) => {
      return (
        <ExceptionOverflowDisplay
          rules={value}
          navigateToUrl={navigateToUrl}
          formatUrl={formatUrl}
        />
      );
    },
  },
  {
    align: 'left',
    field: 'created_at',
    name: i18n.LIST_DATE_CREATED_TITLE,
    truncateText: true,
    dataType: 'date',
    width: '14%',
  },
  {
    align: 'left',
    field: 'updated_at',
    name: i18n.LIST_DATE_UPDATED_TITLE,
    truncateText: true,
    width: '14%',
  },
  {
    align: 'center',
    isExpander: false,
    width: '25px',
    render: ({ id, list_id: listId, namespace_type: namespaceType }: ExceptionListInfo) => (
      <EuiButtonIcon
        onClick={onExport({
          id,
          listId,
          namespaceType,
        })}
        aria-label="Export exception list"
        iconType="exportAction"
        data-test-subj="exceptionsTableExportButton"
      />
    ),
  },
  {
    align: 'center',
    width: '25px',
    isExpander: false,
    render: ({ id, list_id: listId, namespace_type: namespaceType }: ExceptionListInfo) => (
      <EuiButtonIcon
        color="danger"
        onClick={onDelete({ id, listId, namespaceType })}
        aria-label="Delete exception list"
        iconType="trash"
        isDisabled={listId === 'endpoint_list'}
        data-test-subj="exceptionsTableDeleteButton"
      />
    ),
  },
];
