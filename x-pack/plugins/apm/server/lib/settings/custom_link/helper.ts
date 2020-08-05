/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEmpty } from 'lodash';
import {
  CustomLinkES,
  CustomLink,
  Filter,
  FilterKey,
} from '../../../../common/custom_link/custom_link_types';

export function fromESFormat(customLinkES: CustomLinkES): CustomLink {
  const { id, label, url, '@timestamp': timestamp, ...filters } = customLinkES;
  return {
    id,
    '@timestamp': timestamp,
    label,
    url,
    filters: Object.entries(filters).map(
      ([key, value]: [string, string[]]) => ({
        key: key as FilterKey,
        value: isEmpty(value) ? '' : value.join(),
      })
    ),
  };
}

export function toESFormat(customLink: CustomLink): CustomLinkES {
  const { label, url, filters = [] } = customLink;
  const ESFilters = filters
    .filter(({ key, value }) => key && value)
    .reduce((acc: Record<string, string[]>, { key, value }) => {
      acc[key] = splitFilterValueByComma(value);
      return acc;
    }, {});
  return { label, url, ...ESFilters };
}

export function splitFilterValueByComma(filterValue: Filter['value']) {
  return filterValue
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v);
}
