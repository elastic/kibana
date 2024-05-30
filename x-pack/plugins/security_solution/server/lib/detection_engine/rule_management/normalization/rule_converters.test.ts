/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  commonParamsCamelToSnake,
  patchTypeSpecificSnakeToCamel,
  typeSpecificCamelToSnake,
} from './rule_converters';
import {
  getBaseRuleParams,
  getEqlRuleParams,
  getEsqlRuleParams,
  getMlRuleParams,
  getNewTermsRuleParams,
  getQueryRuleParams,
  getSavedQueryRuleParams,
  getThreatRuleParams,
  getThresholdRuleParams,
} from '../../rule_schema/mocks';
import type {
  AlertSuppressionDuration,
  PatchRuleRequestBody,
  AlertSuppressionMissingFieldsStrategy,
} from '../../../../../common/api/detection_engine';

describe('rule_converters', () => {
  describe('patchTypeSpecificSnakeToCamel', () => {
    describe('EQL', () => {
      test('should accept EQL params when existing rule type is EQL', () => {
        const patchParams = {
          timestamp_field: 'event.created',
          event_category_override: 'event.not_category',
          tiebreaker_field: 'event.created',
        };
        const rule = getEqlRuleParams();
        const patchedParams = patchTypeSpecificSnakeToCamel(patchParams, rule);
        expect(patchedParams).toEqual(
          expect.objectContaining({
            timestampField: 'event.created',
            eventCategoryOverride: 'event.not_category',
            tiebreakerField: 'event.created',
          })
        );
      });
      test('should accept EQL params with suppression in snake case and convert to camel case when rule type is EQL', () => {
        const patchParams = {
          timestamp_field: 'event.created',
          event_category_override: 'event.not_category',
          tiebreaker_field: 'event.created',
          alert_suppression: {
            group_by: ['event.type'],
            duration: {
              value: 10,
              unit: 'm',
            } as AlertSuppressionDuration,
            missing_fields_strategy: 'suppress',
          },
        };
        const rule = getEqlRuleParams();
        const patchedParams = patchTypeSpecificSnakeToCamel(patchParams, rule);
        expect(patchedParams).toEqual(
          expect.objectContaining({
            timestampField: 'event.created',
            eventCategoryOverride: 'event.not_category',
            tiebreakerField: 'event.created',
            alertSuppression: {
              groupBy: ['event.type'],
              duration: {
                value: 10,
                unit: 'm',
              },
              missingFieldsStrategy: 'suppress',
            },
          })
        );
      });
      test('should reject invalid EQL params when existing rule type is EQL', () => {
        const patchParams = {
          timestamp_field: 1,
          event_category_override: 1,
          tiebreaker_field: 1,
        } as PatchRuleRequestBody;
        const rule = getEqlRuleParams();
        expect(() => patchTypeSpecificSnakeToCamel(patchParams, rule)).toThrowError(
          'event_category_override: Expected string, received number, tiebreaker_field: Expected string, received number, timestamp_field: Expected string, received number'
        );
      });
      test('should reject EQL params with invalid suppression group_by field', () => {
        const patchParams = {
          timestamp_field: 'event.created',
          event_category_override: 'event.not_category',
          tiebreaker_field: 'event.created',
          alert_suppression: {
            group_by: 'event.type',
            duration: {
              value: 10,
              unit: 'm',
            } as AlertSuppressionDuration,
            missing_fields_strategy: 'suppress',
          },
        };
        const rule = getEqlRuleParams();
        expect(() => patchTypeSpecificSnakeToCamel(patchParams, rule)).toThrowError(
          'alert_suppression.group_by: Expected array, received string'
        );
      });
    });

    describe('machine learning rules', () => {
      test('should accept machine learning params when existing rule type is machine learning', () => {
        const patchParams = {
          anomaly_threshold: 5,
        };
        const rule = getMlRuleParams();
        const patchedParams = patchTypeSpecificSnakeToCamel(patchParams, rule);
        expect(patchedParams).toEqual(
          expect.objectContaining({
            anomalyThreshold: 5,
          })
        );
      });

      test('should reject invalid machine learning params when existing rule type is machine learning', () => {
        const patchParams = {
          anomaly_threshold: 'invalid',
        } as PatchRuleRequestBody;
        const rule = getMlRuleParams();
        expect(() => patchTypeSpecificSnakeToCamel(patchParams, rule)).toThrowError(
          'anomaly_threshold: Expected number, received string'
        );
      });

      it('accepts suppression params', () => {
        const patchParams = {
          alert_suppression: {
            group_by: ['agent.name'],
            missing_fields_strategy: 'suppress' as const,
          },
        };
        const rule = getMlRuleParams();
        const patchedParams = patchTypeSpecificSnakeToCamel(patchParams, rule);

        expect(patchedParams).toEqual(
          expect.objectContaining({
            alertSuppression: {
              groupBy: ['agent.name'],
              missingFieldsStrategy: 'suppress',
            },
          })
        );
      });
    });

    test('should accept threat match params when existing rule type is threat match', () => {
      const patchParams = {
        threat_indicator_path: 'my.indicator',
        threat_query: 'test-query',
      };
      const rule = getThreatRuleParams();
      const patchedParams = patchTypeSpecificSnakeToCamel(patchParams, rule);
      expect(patchedParams).toEqual(
        expect.objectContaining({
          threatIndicatorPath: 'my.indicator',
          threatQuery: 'test-query',
        })
      );
    });

    test('should reject invalid threat match params when existing rule type is threat match', () => {
      const patchParams = {
        threat_indicator_path: 1,
        threat_query: 1,
      } as PatchRuleRequestBody;
      const rule = getThreatRuleParams();
      expect(() => patchTypeSpecificSnakeToCamel(patchParams, rule)).toThrowError(
        'threat_query: Expected string, received number, threat_indicator_path: Expected string, received number'
      );
    });

    test('should accept query params when existing rule type is query', () => {
      const patchParams = {
        index: ['new-test-index'],
        language: 'lucene',
      } as PatchRuleRequestBody;
      const rule = getQueryRuleParams();
      const patchedParams = patchTypeSpecificSnakeToCamel(patchParams, rule);
      expect(patchedParams).toEqual(
        expect.objectContaining({
          index: ['new-test-index'],
          language: 'lucene',
        })
      );
    });

    test('should reject invalid query params when existing rule type is query', () => {
      const patchParams = {
        index: [1],
        language: 'non-language',
      } as PatchRuleRequestBody;
      const rule = getQueryRuleParams();
      expect(() => patchTypeSpecificSnakeToCamel(patchParams, rule)).toThrowError(
        "index.0: Expected string, received number, language: Invalid enum value. Expected 'kuery' | 'lucene', received 'non-language'"
      );
    });

    test('should accept saved query params when existing rule type is saved query', () => {
      const patchParams = {
        index: ['new-test-index'],
        language: 'lucene',
      } as PatchRuleRequestBody;
      const rule = getSavedQueryRuleParams();
      const patchedParams = patchTypeSpecificSnakeToCamel(patchParams, rule);
      expect(patchedParams).toEqual(
        expect.objectContaining({
          index: ['new-test-index'],
          language: 'lucene',
        })
      );
    });

    test('should reject invalid saved query params when existing rule type is saved query', () => {
      const patchParams = {
        index: [1],
        language: 'non-language',
      } as PatchRuleRequestBody;
      const rule = getSavedQueryRuleParams();
      expect(() => patchTypeSpecificSnakeToCamel(patchParams, rule)).toThrowError(
        "index.0: Expected string, received number, language: Invalid enum value. Expected 'kuery' | 'lucene', received 'non-language'"
      );
    });

    test('should accept threshold params when existing rule type is threshold', () => {
      const patchParams = {
        threshold: {
          field: ['host.name'],
          value: 107,
        },
      };
      const rule = getThresholdRuleParams();
      const patchedParams = patchTypeSpecificSnakeToCamel(patchParams, rule);
      expect(patchedParams).toEqual(
        expect.objectContaining({
          threshold: {
            field: ['host.name'],
            value: 107,
          },
        })
      );
    });

    test('should reject invalid threshold params when existing rule type is threshold', () => {
      const patchParams = {
        threshold: {
          field: ['host.name'],
          value: 'invalid',
        },
      } as PatchRuleRequestBody;
      const rule = getThresholdRuleParams();
      expect(() => patchTypeSpecificSnakeToCamel(patchParams, rule)).toThrowError(
        'threshold.value: Expected number, received string'
      );
    });

    test('should accept ES|QL alerts suppression params', () => {
      const patchParams = {
        alert_suppression: {
          group_by: ['agent.name'],
          duration: { value: 4, unit: 'h' as const },
          missing_fields_strategy: 'doNotSuppress' as const,
        },
      };
      const rule = getEsqlRuleParams();
      const patchedParams = patchTypeSpecificSnakeToCamel(patchParams, rule);
      expect(patchedParams).toEqual(
        expect.objectContaining({
          alertSuppression: {
            groupBy: ['agent.name'],
            missingFieldsStrategy: 'doNotSuppress',
            duration: { value: 4, unit: 'h' },
          },
        })
      );
    });

    test('should accept threshold alerts suppression params', () => {
      const patchParams = {
        alert_suppression: {
          duration: { value: 4, unit: 'h' as const },
        },
      };
      const rule = getThresholdRuleParams();
      const patchedParams = patchTypeSpecificSnakeToCamel(patchParams, rule);
      expect(patchedParams).toEqual(
        expect.objectContaining({
          alertSuppression: {
            duration: { value: 4, unit: 'h' },
          },
        })
      );
    });

    test('should accept threat_match alerts suppression params', () => {
      const patchParams = {
        alert_suppression: {
          group_by: ['agent.name'],
          missing_fields_strategy: 'suppress' as const,
        },
      };
      const rule = getThreatRuleParams();
      const patchedParams = patchTypeSpecificSnakeToCamel(patchParams, rule);
      expect(patchedParams).toEqual(
        expect.objectContaining({
          alertSuppression: {
            groupBy: ['agent.name'],
            missingFieldsStrategy: 'suppress',
          },
        })
      );
    });

    test('should accept new_terms alerts suppression params', () => {
      const patchParams = {
        alert_suppression: {
          group_by: ['agent.name'],
          duration: { value: 4, unit: 'h' as const },
          missing_fields_strategy: 'suppress' as const,
        },
      };
      const rule = getNewTermsRuleParams();
      const patchedParams = patchTypeSpecificSnakeToCamel(patchParams, rule);
      expect(patchedParams).toEqual(
        expect.objectContaining({
          alertSuppression: {
            groupBy: ['agent.name'],
            missingFieldsStrategy: 'suppress',
            duration: { value: 4, unit: 'h' },
          },
        })
      );
    });

    test('should accept new terms params when existing rule type is new terms', () => {
      const patchParams = {
        new_terms_fields: ['event.new_field'],
      };
      const rule = getNewTermsRuleParams();
      const patchedParams = patchTypeSpecificSnakeToCamel(patchParams, rule);
      expect(patchedParams).toEqual(
        expect.objectContaining({
          newTermsFields: ['event.new_field'],
        })
      );
    });

    test('should reject invalid new terms params when existing rule type is new terms', () => {
      const patchParams = {
        new_terms_fields: 'invalid',
      } as PatchRuleRequestBody;
      const rule = getNewTermsRuleParams();
      expect(() => patchTypeSpecificSnakeToCamel(patchParams, rule)).toThrowError(
        'new_terms_fields: Expected array, received string'
      );
    });
  });

  describe('typeSpecificCamelToSnake', () => {
    describe('EQL', () => {
      test('should accept EQL params when existing rule type is EQL', () => {
        const params = {
          timestampField: 'event.created',
          eventCategoryOverride: 'event.not_category',
          tiebreakerField: 'event.created',
        };
        const eqlRule = { ...getEqlRuleParams(), ...params };
        const transformedParams = typeSpecificCamelToSnake(eqlRule);
        expect(transformedParams).toEqual(
          expect.objectContaining({
            timestamp_field: 'event.created',
            event_category_override: 'event.not_category',
            tiebreaker_field: 'event.created',
          })
        );
      });

      test('should accept EQL params with suppression in camel case and convert to snake case when rule type is EQL', () => {
        const params = {
          timestampField: 'event.created',
          eventCategoryOverride: 'event.not_category',
          tiebreakerField: 'event.created',
          alertSuppression: {
            groupBy: ['event.type'],
            duration: {
              value: 10,
              unit: 'm',
            } as AlertSuppressionDuration,
            missingFieldsStrategy: 'suppress' as AlertSuppressionMissingFieldsStrategy,
          },
        };
        const eqlRule = { ...getEqlRuleParams(), ...params };
        const transformedParams = typeSpecificCamelToSnake(eqlRule);
        expect(transformedParams).toEqual(
          expect.objectContaining({
            timestamp_field: 'event.created',
            event_category_override: 'event.not_category',
            tiebreaker_field: 'event.created',
            alert_suppression: {
              group_by: ['event.type'],
              duration: {
                value: 10,
                unit: 'm',
              } as AlertSuppressionDuration,
              missing_fields_strategy: 'suppress',
            },
          })
        );
      });
    });

    describe('machine learning rules', () => {
      it('accepts normal params', () => {
        const params = {
          anomalyThreshold: 74,
          machineLearningJobId: ['job-1'],
        };
        const ruleParams = { ...getMlRuleParams(), ...params };
        const transformedParams = typeSpecificCamelToSnake(ruleParams);
        expect(transformedParams).toEqual(
          expect.objectContaining({
            anomaly_threshold: 74,
            machine_learning_job_id: ['job-1'],
          })
        );
      });

      it('accepts suppression params', () => {
        const params = {
          anomalyThreshold: 74,
          machineLearningJobId: ['job-1'],
          alertSuppression: {
            groupBy: ['event.type'],
            duration: {
              value: 10,
              unit: 'm',
            } as AlertSuppressionDuration,
            missingFieldsStrategy: 'suppress' as AlertSuppressionMissingFieldsStrategy,
          },
        };
        const ruleParams = { ...getMlRuleParams(), ...params };
        const transformedParams = typeSpecificCamelToSnake(ruleParams);
        expect(transformedParams).toEqual(
          expect.objectContaining({
            anomaly_threshold: 74,
            machine_learning_job_id: ['job-1'],
            alert_suppression: {
              group_by: ['event.type'],
              duration: {
                value: 10,
                unit: 'm',
              },
              missing_fields_strategy: 'suppress',
            },
          })
        );
      });
    });
  });

  describe('commonParamsCamelToSnake', () => {
    test('should convert rule_source params to snake case', () => {
      const transformedParams = commonParamsCamelToSnake({
        ...getBaseRuleParams(),
        ruleSource: {
          type: 'external',
          isCustomized: false,
        },
      });
      expect(transformedParams).toEqual(
        expect.objectContaining({
          rule_source: {
            type: 'external',
            is_customized: false,
          },
        })
      );
    });
  });
});
