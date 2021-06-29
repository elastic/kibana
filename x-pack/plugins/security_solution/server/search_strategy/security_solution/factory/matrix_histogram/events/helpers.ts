/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface BaseQuery {
  eventActionGroup: {
    terms: {
      min_doc_count?: number;
      order?: {
        _count?: string;
      };
      size?: number;
      field?: string | string[];
      script?: {
        lang: string;
        source: string;
      };
      missing?: string;
    };
    aggs: {
      events?: unknown;
      cardinality_count?: {
        cardinality?: {
          field?: string;
        };
      };
      cardinality_check?: {
        bucket_selector?: {
          buckets_path?: {
            cardinalityCount?: string;
          };
          script?: string;
        };
      };
    };
  };
}

export const buildThresholdTermsQuery = ({
  query,
  fields,
  stackByField,
  missing,
}: {
  query: BaseQuery;
  fields: string[];
  stackByField: string;
  missing: { missing?: string };
}): BaseQuery => {
  if (fields.length > 1) {
    return {
      eventActionGroup: {
        ...query.eventActionGroup,
        terms: {
          ...query.eventActionGroup.terms,
          script: {
            lang: 'painless',
            source: fields.map((f) => `doc['${f}'].value`).join(` + ':' + `),
          },
        },
      },
    };
  } else {
    return {
      eventActionGroup: {
        ...query.eventActionGroup,
        terms: {
          ...query.eventActionGroup.terms,
          field: fields[0] ?? stackByField,
          ...missing,
        },
      },
    };
  }
};

export const buildThresholdCardinalityQuery = ({
  query,
  cardinalityField,
  cardinalityValue,
}: {
  query: BaseQuery;
  cardinalityField: string | undefined;
  cardinalityValue: string;
}): BaseQuery => {
  if (cardinalityField != null && cardinalityField !== '' && cardinalityValue !== '') {
    return {
      eventActionGroup: {
        ...query.eventActionGroup,
        aggs: {
          ...query.eventActionGroup.aggs,
          cardinality_count: {
            cardinality: {
              field: cardinalityField,
            },
          },
          cardinality_check: {
            bucket_selector: {
              buckets_path: {
                cardinalityCount: 'cardinality_count',
              },
              script: `params.cardinalityCount >= ${cardinalityValue}`,
            },
          },
        },
      },
    };
  } else {
    return query;
  }
};
