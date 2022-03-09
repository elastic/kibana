/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { entriesNested, ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  getEntryValue,
  getExceptionOperatorSelect,
  BuilderEntry,
} from '@kbn/securitysolution-list-utils';

import React from 'react';
import { EuiDescriptionListDescription, EuiText, EuiToolTip } from '@elastic/eui';
import { formatOperatingSystems } from '../helpers';
import type { FormattedEntry, DescriptionListItem } from '../types';
import * as i18n from '../translations';

/**
 * Helper method for `getFormattedEntries`
 */
export const formatEntry = ({
  isNested,
  item,
}: {
  isNested: boolean;
  item: BuilderEntry;
}): FormattedEntry => {
  const operator = getExceptionOperatorSelect(item);
  const value = getEntryValue(item);

  return {
    fieldName: item.field ?? '',
    operator: operator.message,
    value,
    isNested,
  };
};

/**
 * Formats ExceptionItem entries into simple field, operator, value
 * for use in rendering items in table
 *
 * @param entries an ExceptionItem's entries
 */
export const getFormattedEntries = (entries: BuilderEntry[]): FormattedEntry[] => {
  const formattedEntries = entries.map((item) => {
    if (entriesNested.is(item)) {
      const parent = {
        fieldName: item.field,
        operator: undefined,
        value: undefined,
        isNested: false,
      };
      return item.entries.reduce<FormattedEntry[]>(
        (acc, nestedEntry) => {
          const formattedEntry = formatEntry({
            isNested: true,
            item: nestedEntry,
          });
          return [...acc, { ...formattedEntry }];
        },
        [parent]
      );
    } else {
      return formatEntry({ isNested: false, item });
    }
  });

  return formattedEntries.flat();
};

/**
 * Formats ExceptionItem details for description list component
 *
 * @param exceptionItem an ExceptionItem
 * @param includeModified if modified information should be included
 * @param includeName if the Name should be included
 */
export const getDescriptionListContent = (
  exceptionItem: ExceptionListItemSchema,
  includeModified: boolean = false,
  includeName: boolean = false
): DescriptionListItem[] => {
  const details = [
    ...(includeName
      ? [
          {
            title: i18n.NAME,
            value: exceptionItem.name,
          },
        ]
      : []),
    {
      title: i18n.OPERATING_SYSTEM,
      value: formatOperatingSystems(exceptionItem.os_types),
    },
    {
      title: i18n.DATE_CREATED,
      value: moment(exceptionItem.created_at).format('MMMM Do YYYY @ HH:mm:ss'),
    },
    {
      title: i18n.CREATED_BY,
      value: exceptionItem.created_by,
    },
    ...(includeModified
      ? [
          {
            title: i18n.DATE_MODIFIED,
            value: moment(exceptionItem.updated_at).format('MMMM Do YYYY @ HH:mm:ss'),
          },
          {
            title: i18n.MODIFIED_BY,
            value: exceptionItem.updated_by,
          },
        ]
      : []),
    {
      title: i18n.DESCRIPTION,
      value: exceptionItem.description,
    },
  ];

  return details.reduce<DescriptionListItem[]>((acc, { value, title }) => {
    if (value != null && value.trim() !== '') {
      const valueElement = (
        <EuiToolTip content={value} anchorClassName="eventFiltersDescriptionListDescription">
          <EuiDescriptionListDescription className="eui-fullWidth">
            {value}
          </EuiDescriptionListDescription>
        </EuiToolTip>
      );
      if (title === i18n.DESCRIPTION) {
        return [
          ...acc,
          {
            title,
            description:
              value.length > 75 ? (
                <EuiDescriptionListDescription style={{ height: 150, overflowY: 'hidden' }}>
                  <EuiText
                    tabIndex={0}
                    role="region"
                    aria-label=""
                    className="eui-yScrollWithShadows"
                    size="s"
                  >
                    {value}
                  </EuiText>
                </EuiDescriptionListDescription>
              ) : (
                valueElement
              ),
          },
        ];
      }
      return [...acc, { title, description: valueElement }];
    } else {
      return acc;
    }
  }, []);
};
