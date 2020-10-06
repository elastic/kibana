/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiTableFieldDataColumnType } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import {
  Immutable,
  TrustedApp,
  MacosLinuxConditionEntry,
  WindowsConditionEntry,
} from '../../../../../../../common/endpoint/types';

import { FormattedDate } from '../../../../../../common/components/formatted_date';
import { ConditionsTable } from '../../../../../../common/components/conditions_table';
import {
  ItemDetailsAction,
  ItemDetailsCard,
  ItemDetailsPropertySummary,
} from '../../../../../../common/components/item_details_card';

import {
  OS_TITLES,
  PROPERTY_TITLES,
  ENTRY_PROPERTY_TITLES,
  CARD_DELETE_BUTTON_LABEL,
  CONDITION_FIELD_TITLE,
} from '../../translations';

type Entry = MacosLinuxConditionEntry | WindowsConditionEntry;

const trimTextOverflow = (text: string, maxSize: number) => {
  if (text.length > maxSize) {
    return `${text.substr(0, maxSize)}...`;
  } else {
    return text;
  }
};

const getEntriesColumnDefinitions = (): Array<EuiTableFieldDataColumnType<Entry>> => [
  {
    field: 'field',
    name: ENTRY_PROPERTY_TITLES.field,
    sortable: false,
    truncateText: true,
    textOnly: true,
    width: '30%',
    render(field: MacosLinuxConditionEntry['field'], entry: Entry) {
      return CONDITION_FIELD_TITLE[field];
    },
  },
  {
    field: 'operator',
    name: ENTRY_PROPERTY_TITLES.operator,
    sortable: false,
    truncateText: true,
    width: '20%',
    render() {
      return i18n.translate('xpack.securitySolution.trustedapps.card.operator.includes', {
        defaultMessage: 'is',
      });
    },
  },
  {
    field: 'value',
    name: ENTRY_PROPERTY_TITLES.value,
    sortable: false,
    truncateText: true,
    width: '60%',
  },
];

interface TrustedAppCardProps {
  trustedApp: Immutable<TrustedApp>;
  onDelete: (trustedApp: Immutable<TrustedApp>) => void;
}

export const TrustedAppCard = memo(({ trustedApp, onDelete }: TrustedAppCardProps) => {
  const handleDelete = useCallback(() => onDelete(trustedApp), [onDelete, trustedApp]);

  return (
    <ItemDetailsCard>
      <ItemDetailsPropertySummary name={PROPERTY_TITLES.name} value={trustedApp.name} />
      <ItemDetailsPropertySummary name={PROPERTY_TITLES.os} value={OS_TITLES[trustedApp.os]} />
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
      <ItemDetailsPropertySummary name={PROPERTY_TITLES.created_by} value={trustedApp.created_by} />
      <ItemDetailsPropertySummary
        name={PROPERTY_TITLES.description}
        value={useMemo(() => trimTextOverflow(trustedApp.description || '', 100), [
          trustedApp.description,
        ])}
        title={trustedApp.description}
      />

      <ConditionsTable
        columns={useMemo(() => getEntriesColumnDefinitions(), [])}
        items={useMemo(() => [...trustedApp.entries], [trustedApp.entries])}
        badge="and"
        responsive
      />

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
});

TrustedAppCard.displayName = 'TrustedAppCard';
