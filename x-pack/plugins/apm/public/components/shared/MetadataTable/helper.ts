/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get, isEmpty, pick } from 'lodash';
import type { APMError } from '../../../../typings/es_schemas/ui/apm_error';
import type { Span } from '../../../../typings/es_schemas/ui/span';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import type { KeyValuePair } from '../../../utils/flattenObject';
import { flattenObject } from '../../../utils/flattenObject';
import type { Section } from './sections';

export type SectionsWithRows = ReturnType<typeof getSectionsWithRows>;

export const getSectionsWithRows = (
  sections: Section[],
  apmDoc: Transaction | APMError | Span
) => {
  return sections
    .map((section) => {
      const sectionData: Record<string, unknown> = get(apmDoc, section.key);
      const filteredData:
        | Record<string, unknown>
        | undefined = section.properties
        ? pick(sectionData, section.properties)
        : sectionData;

      const rows: KeyValuePair[] = flattenObject(filteredData, section.key);
      return { ...section, rows };
    })
    .filter(({ required, rows }) => required || !isEmpty(rows));
};

export const filterSectionsByTerm = (
  sections: SectionsWithRows,
  searchTerm: string
) => {
  if (!searchTerm) {
    return sections;
  }
  return sections
    .map((section) => {
      const { rows = [] } = section;
      const filteredRows = rows.filter(({ key, value }) => {
        const valueAsString = String(value).toLowerCase();
        return (
          key.toLowerCase().includes(searchTerm) ||
          valueAsString.includes(searchTerm)
        );
      });
      return { ...section, rows: filteredRows };
    })
    .filter(({ rows }) => !isEmpty(rows));
};
