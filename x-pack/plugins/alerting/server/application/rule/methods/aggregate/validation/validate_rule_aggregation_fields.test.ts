/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleTagsAggregation } from '../../../../../../common';
import { defaultRuleAggregationFactory } from '..';

import { validateRuleAggregationFields } from './validate_rule_aggregation_fields';

describe('validateAggregationTerms', () => {
  it('should allow for simple valid aggregations', () => {
    expect(() => {
      validateRuleAggregationFields({
        name1: {
          terms: {
            field: 'alert.attributes.lastRun.outcome',
          },
        },
        name2: {
          terms: {
            field: 'alert.attributes.tags',
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
            field: 'alert.attributes.executionStatus.status',
          },
          aggs: {
            nestedAggs: {
              terms: {
                field: 'alert.attributes.snoozeSchedule',
              },
              aggs: {
                anotherNestedAgg: {
                  terms: {
                    field: 'alert.attributes.alertTypeId',
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
          composite: {
            sources: [
              {
                tags: {
                  terms: {
                    field: 'alert.attributes.tags',
                    order: 'asc' as const,
                  },
                },
              },
            ],
          },
          terms: {
            field: 'alert.attributes.muteAll',
          },
          aggs: {
            nestedAggs: {
              nested: {
                path: 'alert.attributes.snoozeSchedule',
              },
              terms: {
                field: 'alert.attributes.enabled',
              },
              aggs: {
                nestedAggsAgain: {
                  terms: {
                    field: 'alert.attributes.executionStatus.status',
                  },
                },
              },
            },
          },
        },
      });
    }).not.toThrowError();
  });

  it('should allow for default and tags aggregations', () => {
    expect(() => validateRuleAggregationFields(defaultRuleAggregationFactory())).not.toThrowError();
    expect(() => validateRuleAggregationFields(getRuleTagsAggregation())).not.toThrowError();
  });

  it('should throw for simple aggregation with invalid fields', () => {
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
    }).toThrowErrorMatchingInlineSnapshot(`"Invalid aggregation term: alert.attributes.bar"`);
  });

  it('should throw for nested aggregations with invalid fields', () => {
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
            field: 'alert.attributes.snoozeSchedule',
          },
          aggs: {
            nestedAggs: {
              terms: {
                field: 'alert.attributes.enabled',
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

  it('should throw for both aggs and aggregations at the same nesting level with invalid fields', () => {
    expect(() => {
      validateRuleAggregationFields({
        name1: {
          terms: {
            field: 'alert.attributes.snoozeSchedule',
          },
          aggs: {
            nestedAggs1: {
              terms: {
                field: 'alert.attributes.enabled',
              },
            },
          },
          aggregations: {
            nestedAggs2: {
              terms: {
                field: 'alert.attributes.consumer',
              },
            },
          },
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Invalid aggregation term: alert.attributes.consumer"`);

    expect(() => {
      validateRuleAggregationFields({
        name1: {
          terms: {
            field: 'alert.attributes.snoozeSchedule',
          },
          aggs: {
            nestedAggs1: {
              terms: {
                field: 'alert.attributes.consumer',
              },
            },
          },
          aggregations: {
            nestedAggs2: {
              terms: {
                field: 'alert.attributes.enabled',
              },
            },
          },
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Invalid aggregation term: alert.attributes.consumer"`);
  });

  it('should throw for nested aggregations with invalid root level aggs types', () => {
    expect(() => {
      validateRuleAggregationFields({
        name1: {
          cardinality: {
            field: 'alert.attributes.muteAll',
          },
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Invalid aggregation type: cardinality"`);

    expect(() => {
      validateRuleAggregationFields({
        name1: {
          aggs: {
            nestedAggs: {
              terms: {
                field: 'alert.attributes.executionStatus.status',
              },
              avg: {
                field: 'alert.attributes.executionStatus.status',
              },
            },
          },
          max: {
            field: 'alert.attributes.executionStatus.status',
          },
          cardinality: {
            field: 'alert.attributes.executionStatus.status',
          },
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Invalid aggregation type: max"`);
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
    }).toThrowErrorMatchingInlineSnapshot(`"Invalid aggregation type: multi_terms"`);

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
    }).toThrowErrorMatchingInlineSnapshot(`"Invalid aggregation type: multi_terms"`);
  });
});
