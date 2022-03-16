/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, groupBy, partition } from 'lodash';
import type { SectionDescriptor } from './types';

const EXCLUDED_FIELDS = ['error.exception.stacktrace', 'span.stacktrace'];

export const getSectionsFromFields = (fields: Record<string, any>) => {
  const rows = Object.keys(fields)
    .filter(
      (field) => !EXCLUDED_FIELDS.some((excluded) => field.startsWith(excluded))
    )
    .sort()
    .map((field) => {
      return {
        section: field.split('.')[0],
        field,
        value: fields[field],
      };
    });

  const sections = Object.values(groupBy(rows, 'section')).map(
    (rowsForSection) => {
      const first = rowsForSection[0];

      const section: SectionDescriptor = {
        key: first.section,
        label: first.section.toLowerCase(),
        properties: rowsForSection.map((row) => ({
          field: row.field,
          value: row.value,
        })),
      };

      return section;
    }
  );

  const [labelSections, otherSections] = partition(
    sections,
    (section) => section.key === 'labels'
  );

  return [...labelSections, ...otherSections];
};

export const filterSectionsByTerm = (
  sections: SectionDescriptor[],
  searchTerm: string
) => {
  if (!searchTerm) {
    return sections;
  }
  return sections
    .map((section) => {
      const { properties = [] } = section;
      const filteredProps = properties.filter(({ field, value }) => {
        return (
          field.toLowerCase().includes(searchTerm) ||
          value.some((val: string | number) =>
            String(val).toLowerCase().includes(searchTerm)
          )
        );
      });
      return { ...section, properties: filteredProps };
    })
    .filter(({ properties }) => !isEmpty(properties));
};
