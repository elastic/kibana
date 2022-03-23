/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiBasicTableColumn, EuiToolTip } from '@elastic/eui';

import type { NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { DEFAULT_RELATIVE_DATE_THRESHOLD } from '../../../../../../../common/constants';
import { FormatUrl } from '../../../../../../common/components/link_to';
import { PopoverItems } from '../../../../../../common/components/popover_items';
import { FormattedRelativePreferenceDate } from '../../../../../../common/components/formatted_date';
import { getRuleDetailsUrl } from '../../../../../../common/components/link_to/redirect_to_detection_engine';
import { LinkAnchor } from '../../../../../../common/components/links';
import * as i18n from './translations';
import { ExceptionListInfo } from './use_all_exception_lists';
import { ExceptionsTableItem } from './types';

export type AllExceptionListsColumns = EuiBasicTableColumn<ExceptionsTableItem>;

const RULES_TO_DISPLAY = 1;

export const getAllExceptionListsColumns = (
  onExport: (arg: { id: string; listId: string; namespaceType: NamespaceType }) => () => void,
  onDelete: (arg: { id: string; listId: string; namespaceType: NamespaceType }) => () => void,
  formatUrl: FormatUrl,
  navigateToUrl: (url: string) => Promise<void>,
  isKibanaReadOnly: boolean
): AllExceptionListsColumns[] => [
  {
    align: 'left',
    field: 'list_id',
    name: i18n.EXCEPTION_LIST_ID_TITLE,
    truncateText: true,
    dataType: 'string',
    width: '20%',
    render: (value: ExceptionListInfo['list_id']) => (
      <EuiToolTip content={value} anchorClassName="eui-textTruncate">
        <span data-test-subj="exceptionsTableListId">{value}</span>
      </EuiToolTip>
    ),
  },
  {
    align: 'left',
    field: 'name',
    name: i18n.EXCEPTION_LIST_NAME,
    truncateText: true,
    dataType: 'string',
    width: '20%',
    render: (value: ExceptionListInfo['name']) => (
      <EuiToolTip content={value} anchorClassName="eui-textTruncate">
        <span data-test-subj="exceptionsTableName">{value}</span>
      </EuiToolTip>
    ),
  },
  {
    field: 'rules',
    name: i18n.RULES_ASSIGNED_TO_TITLE,
    dataType: 'string',
    width: '30%',
    render: (rules: ExceptionListInfo['rules']) => {
      const renderItem = <T extends ExceptionListInfo['rules'][number]>(
        { id, name }: T,
        index: number,
        items: T[]
      ) => {
        const ruleHref = formatUrl(getRuleDetailsUrl(id));
        const isSeparator = index !== items.length - 1;
        return (
          <>
            <EuiToolTip content={name} anchorClassName="eui-textTruncate">
              <>
                <LinkAnchor
                  key={id}
                  data-test-subj="ruleNameLink"
                  onClick={(ev: { preventDefault: () => void }) => {
                    ev.preventDefault();
                    navigateToUrl(ruleHref);
                  }}
                  href={ruleHref}
                >
                  {name}
                  {isSeparator && ','}
                </LinkAnchor>
              </>
            </EuiToolTip>
            {isSeparator && ' '}
          </>
        );
      };

      return (
        <PopoverItems
          items={rules}
          numberOfItemsToDisplay={RULES_TO_DISPLAY}
          popoverTitle={i18n.RULES_ASSIGNED_TO_TITLE}
          popoverButtonTitle={i18n.showMoreRules(rules.length - 1)}
          renderItem={renderItem}
          dataTestPrefix="rules"
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
    width: '15%',
    render: (value: ExceptionListInfo['created_at']) => (
      <FormattedRelativePreferenceDate
        relativeThresholdInHrs={DEFAULT_RELATIVE_DATE_THRESHOLD}
        value={value}
        tooltipFieldName={i18n.LIST_DATE_CREATED_TITLE}
        tooltipAnchorClassName="eui-textTruncate"
      />
    ),
  },
  {
    align: 'left',
    field: 'updated_at',
    name: i18n.LIST_DATE_UPDATED_TITLE,
    truncateText: true,
    width: '15%',
    render: (value: ExceptionListInfo['updated_at']) => (
      <FormattedRelativePreferenceDate
        relativeThresholdInHrs={DEFAULT_RELATIVE_DATE_THRESHOLD}
        value={value}
        tooltipFieldName={i18n.LIST_DATE_UPDATED_TITLE}
        tooltipAnchorClassName="eui-textTruncate"
      />
    ),
  },
  {
    align: 'left',
    width: '76px',
    name: i18n.EXCEPTION_LIST_ACTIONS,
    actions: [
      {
        render: ({ id, list_id: listId, namespace_type: namespaceType }: ExceptionListInfo) => (
          <EuiButtonIcon
            onClick={onExport({
              id,
              listId,
              namespaceType,
            })}
            aria-label="Export exception list"
            iconType="download"
            data-test-subj="exceptionsTableExportButton"
          />
        ),
      },
      {
        render: ({ id, list_id: listId, namespace_type: namespaceType }: ExceptionListInfo) => {
          return listId === 'endpoint_list' || isKibanaReadOnly ? (
            <></>
          ) : (
            <EuiButtonIcon
              color="danger"
              onClick={onDelete({ id, listId, namespaceType })}
              aria-label="Delete exception list"
              iconType="trash"
              data-test-subj="exceptionsTableDeleteButton"
            />
          );
        },
      },
    ],
  },
];
