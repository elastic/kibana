/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';

import { entriesNested, ExceptionListItemSchema } from '../../../../lists_plugin_deps';
import { getEntryValue, getExceptionOperatorSelect, formatOperatingSystems } from '../helpers';
import { FormattedEntry, BuilderEntry, DescriptionListItem } from '../types';
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
 */
export const getDescriptionListContent = (
  exceptionItem: ExceptionListItemSchema
): DescriptionListItem[] => {
  const details = [
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
    {
      title: i18n.DESCRIPTION,
      value: exceptionItem.description,
    },
  ];

  return details.reduce<DescriptionListItem[]>((acc, { value, title }) => {
    if (value != null && value.trim() !== '') {
      return [...acc, { title, description: value }];
    } else {
      return acc;
    }
  }, []);
};
