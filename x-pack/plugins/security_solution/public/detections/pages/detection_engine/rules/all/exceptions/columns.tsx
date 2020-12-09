/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable react/display-name */

import React from 'react';
import { EuiButtonIcon, EuiBasicTableColumn } from '@elastic/eui';
import { History } from 'history';

import { FormatUrl } from '../../../../../../common/components/link_to';
import { LinkAnchor } from '../../../../../../common/components/links';
import * as i18n from './translations';
import { ExceptionListInfo } from './use_all_exception_lists';
import { getRuleDetailsUrl } from '../../../../../../common/components/link_to/redirect_to_detection_engine';

export type AllExceptionListsColumns = EuiBasicTableColumn<ExceptionListInfo>;
export type Func = (listId: string) => () => void;

export const getAllExceptionListsColumns = (
  onExport: Func,
  onDelete: Func,
  history: History,
  formatUrl: FormatUrl
): AllExceptionListsColumns[] => [
  {
    align: 'left',
    field: 'list_id',
    name: i18n.EXCEPTION_LIST_ID_TITLE,
    truncateText: true,
    dataType: 'string',
    width: '100px',
  },
  {
    align: 'center',
    field: 'rules',
    name: i18n.NUMBER_RULES_ASSIGNED_TO_TITLE,
    truncateText: true,
    dataType: 'number',
    width: '14%',
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
    width: '14%',
    render: (value: ExceptionListInfo['rules']) => {
      return (
        <>
          {value.map(({ id, name }, index) => (
            <>
              <LinkAnchor
                data-test-subj="ruleName"
                onClick={(ev: { preventDefault: () => void }) => {
                  ev.preventDefault();
                  history.push(getRuleDetailsUrl(id));
                }}
                href={formatUrl(getRuleDetailsUrl(id))}
              >
                {name}
              </LinkAnchor>
              {index !== value.length - 1 ? ', ' : ''}
            </>
          ))}
        </>
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
    width: '20px',
    render: (list: ExceptionListInfo) => (
      <EuiButtonIcon
        onClick={onExport(list.id)}
        aria-label="Export exception list"
        iconType="exportAction"
      />
    ),
  },
  {
    align: 'center',
    width: '20px',
    isExpander: false,
    render: (list: ExceptionListInfo) => (
      <EuiButtonIcon
        color="danger"
        onClick={onDelete(list.id)}
        aria-label="Delete exception list"
        iconType="trash"
      />
    ),
  },
];
