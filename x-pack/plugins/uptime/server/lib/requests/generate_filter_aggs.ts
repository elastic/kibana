/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface AggDefinition {
  aggName: string;
  filterName: string;
  field: string;
}

export const FIELD_MAPPINGS: Record<string, string> = {
  schemes: 'monitor.type',
  ports: 'url.port',
  locations: 'observer.geo.name',
  tags: 'tags',
};

const getFilterAggConditions = (filterTerms: Record<string, any[]>, except: string) => {
  const filters: any[] = [];

  Object.keys(filterTerms).forEach((key: string) => {
    if (key === except && FIELD_MAPPINGS[key]) return;
    filters.push(
      ...filterTerms[key].map((value) => ({
        term: {
          [FIELD_MAPPINGS[key]]: value,
        },
      }))
    );
  });

  return filters;
};

export const generateFilterAggs = (
  aggDefinitions: AggDefinition[],
  filterOptions: Record<string, string[] | number[]>
) =>
  aggDefinitions
    .map(({ aggName, filterName, field }) => ({
      [aggName]: {
        filter: {
          bool: {
            should: [...getFilterAggConditions(filterOptions, filterName)],
          },
        },
        aggs: {
          term: {
            terms: {
              field,
            },
          },
        },
      },
    }))
    .reduce((parent: Record<string, any>, agg: any) => ({ ...parent, ...agg }), {});
