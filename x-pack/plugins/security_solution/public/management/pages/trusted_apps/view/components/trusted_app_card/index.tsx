/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiTableFieldDataColumnType } from '@elastic/eui';

import {
  Immutable,
  TrustedApp,
  MacosLinuxConditionEntry,
  WindowsConditionEntry,
} from '../../../../../../../common/endpoint/types';

import { FormattedDate } from '../../../../../../common/components/formatted_date';
import { ConditionsTable } from '../../../../../../common/components/conditions_table';
import { TextFieldValue } from '../../../../../../common/components/text_field_value';
import {
  ItemDetailsAction,
  ItemDetailsCard,
  ItemDetailsCardProps,
  ItemDetailsPropertySummary,
} from '../../../../../../common/components/item_details_card';

import {
  OS_TITLES,
  PROPERTY_TITLES,
  ENTRY_PROPERTY_TITLES,
  CARD_DELETE_BUTTON_LABEL,
  CONDITION_FIELD_TITLE,
  OPERATOR_TITLES,
  CARD_EDIT_BUTTON_LABEL,
} from '../../translations';

type Entry = MacosLinuxConditionEntry | WindowsConditionEntry;

const getEntriesColumnDefinitions = (): Array<EuiTableFieldDataColumnType<Entry>> => [
  {
    field: 'field',
    name: ENTRY_PROPERTY_TITLES.field,
    sortable: false,
    truncateText: true,
    textOnly: true,
    width: '30%',
    render(field: Entry['field'], _entry: Entry) {
      return CONDITION_FIELD_TITLE[field];
    },
  },
  {
    field: 'operator',
    name: ENTRY_PROPERTY_TITLES.operator,
    sortable: false,
    truncateText: true,
    width: '20%',
    render(_field: Entry['operator'], entry: Entry) {
      return entry.type === 'wildcard' ? OPERATOR_TITLES.matches : OPERATOR_TITLES.is;
    },
  },
  {
    field: 'value',
    name: ENTRY_PROPERTY_TITLES.value,
    sortable: false,
    width: '60%',
    'data-test-subj': 'conditionValue',
    render(field: Entry['value'], entry: Entry) {
      return (
        <TextFieldValue
          className="eui-textTruncate"
          fieldName={CONDITION_FIELD_TITLE[entry.field]}
          value={field}
        />
      );
    },
  },
];

export type TrustedAppCardProps = Pick<ItemDetailsCardProps, 'data-test-subj'> & {
  trustedApp: Immutable<TrustedApp>;
  onDelete: (trustedApp: Immutable<TrustedApp>) => void;
  onEdit: (trustedApp: Immutable<TrustedApp>) => void;
};

export const TrustedAppCard = memo<TrustedAppCardProps>(
  ({ trustedApp, onDelete, onEdit, ...otherProps }) => {
    const handleDelete = useCallback(() => onDelete(trustedApp), [onDelete, trustedApp]);
    const handleEdit = useCallback(() => onEdit(trustedApp), [onEdit, trustedApp]);

    return (
      <ItemDetailsCard {...otherProps}>
        <ItemDetailsPropertySummary
          name={PROPERTY_TITLES.name}
          value={
            <TextFieldValue
              fieldName={PROPERTY_TITLES.name}
              value={trustedApp.name}
              maxLength={100}
            />
          }
        />
        <ItemDetailsPropertySummary
          name={PROPERTY_TITLES.os}
          value={<TextFieldValue fieldName={PROPERTY_TITLES.os} value={OS_TITLES[trustedApp.os]} />}
        />
        <ItemDetailsPropertySummary
          name={PROPERTY_TITLES.created_at}
          value={
            <FormattedDate
              fieldName={PROPERTY_TITLES.created_at}
              value={trustedApp.created_at}
              className="eui-textTruncate"
            />
          }
        />
        <ItemDetailsPropertySummary
          name={PROPERTY_TITLES.created_by}
          value={
            <TextFieldValue fieldName={PROPERTY_TITLES.created_by} value={trustedApp.created_by} />
          }
        />
        <ItemDetailsPropertySummary
          name={PROPERTY_TITLES.updated_at}
          value={
            <FormattedDate
              fieldName={PROPERTY_TITLES.updated_at}
              value={trustedApp.updated_at}
              className="eui-textTruncate"
            />
          }
        />
        <ItemDetailsPropertySummary
          name={PROPERTY_TITLES.updated_by}
          value={
            <TextFieldValue
              fieldName={PROPERTY_TITLES.updated_by}
              value={trustedApp.updated_by}
              className="eui-textTruncate"
            />
          }
        />
        <ItemDetailsPropertySummary
          name={PROPERTY_TITLES.description}
          value={
            <TextFieldValue
              fieldName={PROPERTY_TITLES.description || ''}
              value={trustedApp.description || ''}
              maxLength={100}
            />
          }
        />

        <ConditionsTable
          columns={useMemo(() => getEntriesColumnDefinitions(), [])}
          items={useMemo(() => [...trustedApp.entries], [trustedApp.entries])}
          badge="and"
          responsive
        />

        <ItemDetailsAction
          size="s"
          color="primary"
          fill
          onClick={handleEdit}
          data-test-subj="trustedAppEditButton"
        >
          {CARD_EDIT_BUTTON_LABEL}
        </ItemDetailsAction>

        <ItemDetailsAction
          size="s"
          color="danger"
          onClick={handleDelete}
          data-test-subj="trustedAppDeleteButton"
        >
          {CARD_DELETE_BUTTON_LABEL}
        </ItemDetailsAction>
      </ItemDetailsCard>
    );
  }
);

TrustedAppCard.displayName = 'TrustedAppCard';
