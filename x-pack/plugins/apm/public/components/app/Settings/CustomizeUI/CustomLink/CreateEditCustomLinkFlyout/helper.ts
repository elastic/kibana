/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import Mustache from 'mustache';
import { isEmpty, get } from 'lodash';
import { FILTER_OPTIONS } from '../../../../../../../common/custom_link/custom_link_filter_options';
import {
  Filter,
  FilterKey,
} from '../../../../../../../common/custom_link/custom_link_types';
import { Transaction } from '../../../../../../../typings/es_schemas/ui/transaction';

interface FilterSelectOption {
  value: 'DEFAULT' | FilterKey;
  text: string;
}

export const DEFAULT_OPTION: FilterSelectOption = {
  value: 'DEFAULT',
  text: i18n.translate(
    'xpack.apm.settings.customizeUI.customLink.flyOut.filters.defaultOption',
    { defaultMessage: 'Select field...' }
  ),
};

export const FILTER_SELECT_OPTIONS: FilterSelectOption[] = [
  DEFAULT_OPTION,
  ...FILTER_OPTIONS.map((filter) => ({
    value: filter,
    text: filter,
  })),
];

/**
 * Returns the options available, removing filters already added, but keeping the selected filter.
 *
 * @param filters
 * @param selectedKey
 */
export const getSelectOptions = (
  filters: Filter[],
  selectedKey: Filter['key']
) => {
  return FILTER_SELECT_OPTIONS.filter(
    ({ value }) =>
      !filters.some(({ key }) => key === value && key !== selectedKey)
  );
};

const getInvalidTemplateVariables = (
  template: string,
  transaction: Transaction
) => {
  return (Mustache.parse(template) as Array<[string, string]>)
    .filter(([type]) => type === 'name')
    .map(([, value]) => value)
    .filter((templateVar) => get(transaction, templateVar) == null);
};

const validateUrl = (url: string, transaction?: Transaction) => {
  if (!transaction || isEmpty(transaction)) {
    return i18n.translate(
      'xpack.apm.settings.customizeUI.customLink.preview.transaction.notFound',
      {
        defaultMessage:
          "We couldn't find a matching transaction document based on the defined filters.",
      }
    );
  }
  try {
    const invalidVariables = getInvalidTemplateVariables(url, transaction);
    if (!isEmpty(invalidVariables)) {
      return i18n.translate(
        'xpack.apm.settings.customizeUI.customLink.preview.contextVariable.noMatch',
        {
          defaultMessage:
            "We couldn't find a value match for {variables} in the example transaction document.",
          values: {
            variables: invalidVariables
              .map((variable) => `{{${variable}}}`)
              .join(', '),
          },
        }
      );
    }
  } catch (e) {
    return i18n.translate(
      'xpack.apm.settings.customizeUI.customLink.preview.contextVariable.invalid',
      {
        defaultMessage:
          "We couldn't find an example transaction document due to invalid variable(s) defined.",
      }
    );
  }
};

export const replaceTemplateVariables = (
  url: string,
  transaction?: Transaction
) => {
  const error = validateUrl(url, transaction);
  try {
    return { formattedUrl: Mustache.render(url, transaction), error };
  } catch (e) {
    // errors will be caught on validateUrl function
    return { formattedUrl: url, error };
  }
};

export const convertFiltersToQuery = (filters: Filter[]) => {
  return filters.reduce((acc: Record<string, string>, { key, value }) => {
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {});
};
