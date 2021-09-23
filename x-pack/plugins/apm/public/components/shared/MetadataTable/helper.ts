/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, groupBy, capitalize } from 'lodash';
import type { SectionDescriptor } from './types';

export const getSectionsFromFields = (fields: Record<string, any>) => {
  const rows = Object.keys(fields)
    .sort()
    .map((key) => {
      return {
        section: key.split('.')[0],
        field: key,
        value: fields[key],
      };
    });

  return Object.values(groupBy(rows, 'section')).map((rowsForSection) => {
    const first = rowsForSection[0];

    const section: SectionDescriptor = {
      key: first.section,
      label: capitalize(first.section),
      properties: rowsForSection.map((row) => ({
        field: row.field,
        value: row.value,
      })),
    };

    return section;
  });
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
