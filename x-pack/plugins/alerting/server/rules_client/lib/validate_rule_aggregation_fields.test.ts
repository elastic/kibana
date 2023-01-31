/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateRuleAggregationFields } from './validate_rule_aggregation_fields';

describe('validateAggregationTerms', () => {
  it('should allow for simple valid aggregations', () => {
    expect(() => {
      validateRuleAggregationFields({
        name1: {
          terms: {
            field: 'foo.attributes.bar',
          },
        },
        name2: {
          terms: {
            field: 'foo.attributes.bar1',
          },
        },
      });
    }).not.toThrowError();
  });

  it('should allow for nested valid aggregations', () => {
    expect(() => {
      validateRuleAggregationFields({
        name1: {
          terms: {
            field: 'foo.attributes.bar',
          },
          aggs: {
            nestedAggs: {
              terms: {
                field: 'foo.attributes.bar1',
              },
              aggs: {
                anotherNestedAgg: {
                  terms: {
                    field: 'foo.attributes.bar2',
                  },
                },
              },
            },
          },
        },
      });
    }).not.toThrowError();
  });

  it('should allow for nested valid aggregations with root level aggs', () => {
    expect(() => {
      validateRuleAggregationFields({
        name1: {
          max: {
            field: 'foo.attributes.bar',
          },
          cardinality: {
            field: 'foo.attributes.bar1',
          },
          aggs: {
            nestedAggs: {
              min: {
                field: 'foo.attributes.bar2',
              },
              avg: {
                field: 'foo.attributes.bar3',
              },
            },
          },
        },
      });
    }).not.toThrowError();
  });

  it('should allow for valid multi_terms aggregations', () => {
    expect(() => {
      validateRuleAggregationFields({
        name1: {
          multi_terms: {
            terms: [{ field: 'foo.attributes.bar' }, { field: 'foo.attributes.bar1' }],
          },
          aggs: {
            nestedAggs: {
              multi_terms: {
                terms: [{ field: 'foo.attributes.bar2' }, { field: 'foo.attributes.bar3' }],
              },
            },
          },
        },
      });
    }).not.toThrowError();
  });

  it('should throw for simple invalid aggregations', () => {
    expect(() => {
      validateRuleAggregationFields({
        name1: {
          terms: {
            field: 'alert.attributes.apiKey',
          },
        },
        name2: {
          terms: {
            field: 'foo.attributes.bar1',
          },
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Invalid aggregation term: alert.attributes.apiKey"`);

    expect(() => {
      validateRuleAggregationFields({
        name1: {
          terms: {
            field: 'alert.attributes.bar',
          },
        },
        name2: {
          terms: {
            field: 'alert.attributes.consumer',
          },
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Invalid aggregation term: alert.attributes.consumer"`);
  });

  it('should throw for nested invalid aggregations', () => {
    expect(() => {
      validateRuleAggregationFields({
        name1: {
          terms: {
            field: 'alert.attributes.apiKey',
          },
          aggs: {
            nestedAggs: {
              terms: {
                field: 'foo.attributes.bar1',
              },
              aggs: {
                anotherNestedAgg: {
                  terms: {
                    field: 'foo.attributes.bar2',
                  },
                },
              },
            },
          },
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Invalid aggregation term: alert.attributes.apiKey"`);

    expect(() => {
      validateRuleAggregationFields({
        name1: {
          terms: {
            field: 'alert.attributes.bar',
          },
          aggs: {
            nestedAggs: {
              terms: {
                field: 'foo.attributes.bar1',
              },
              aggs: {
                anotherNestedAgg: {
                  terms: {
                    field: 'alert.attributes.consumer',
                  },
                },
              },
            },
          },
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Invalid aggregation term: alert.attributes.consumer"`);
  });

  it('should throw for nested invalid aggregations with root level aggs', () => {
    expect(() => {
      validateRuleAggregationFields({
        name1: {
          cardinality: {
            field: 'alert.attributes.apiKey',
          },
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Invalid aggregation term: alert.attributes.apiKey"`);

    expect(() => {
      validateRuleAggregationFields({
        name1: {
          max: {
            field: 'foo.attributes.bar',
          },
          cardinality: {
            field: 'foo.attributes.bar1',
          },
          aggs: {
            nestedAggs: {
              min: {
                field: 'foo.attributes.bar2',
              },
              avg: {
                field: 'alert.attributes.consumer',
              },
            },
          },
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Invalid aggregation term: alert.attributes.consumer"`);
  });

  it('should throw for invalid multi_terms aggregations', () => {
    expect(() => {
      validateRuleAggregationFields({
        name1: {
          multi_terms: {
            terms: [{ field: 'foo.attributes.bar' }, { field: 'alert.attributes.apiKey' }],
          },
          aggs: {
            nestedAggs: {
              multi_terms: {
                terms: [{ field: 'foo.attributes.bar2' }, { field: 'foo.attributes.bar3' }],
              },
            },
          },
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Invalid aggregation term: alert.attributes.apiKey"`);

    expect(() => {
      validateRuleAggregationFields({
        name1: {
          multi_terms: {
            terms: [{ field: 'foo.attributes.bar' }, { field: 'foo.attributes.bar1' }],
          },
          aggs: {
            nestedAggs: {
              multi_terms: {
                terms: [{ field: 'alert.attributes.consumer' }, { field: 'foo.attributes.bar3' }],
              },
            },
          },
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Invalid aggregation term: alert.attributes.consumer"`);
  });
});
