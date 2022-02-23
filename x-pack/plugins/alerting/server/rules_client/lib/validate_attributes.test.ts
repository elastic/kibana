/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as esKuery from '@kbn/es-query';
import {
  validateSortField,
  validateSearchFields,
  validateFilterKueryNode,
} from './validate_attributes';

describe('Validate attributes', () => {
  const excludedFieldNames = ['monitoring'];
  describe('validateSortField', () => {
    test('should NOT throw an error, when sort field is not part of the field to exclude', () => {
      expect(() => validateSortField('name.keyword', excludedFieldNames)).not.toThrow();
    });

    test('should NOT throw an error, when sort field is not a descendant of the field to exclude', () => {
      expect(() =>
        validateSortField('new_field.monitoring.metrics.success', excludedFieldNames)
      ).not.toThrow();
    });

    test('should throw an error, when sort field is part of the field to exclude', () => {
      expect(() =>
        validateSortField(
          'monitoring.execution.calculated_metrics.success_ratio',
          excludedFieldNames
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"Sort is not supported on this field monitoring.execution.calculated_metrics.success_ratio"`
      );
    });
  });

  describe('validateSearchFields', () => {
    test('should NOT throw an error, when search field is not part of the field to exclude', () => {
      expect(() => validateSearchFields(['name', 'tags'], excludedFieldNames)).not.toThrow();
    });

    test('should NOT throw an error, when search field is not a descendant of the field to exclude', () => {
      expect(() =>
        validateSearchFields(
          ['name', 'tags', 'new_field.monitoring.metrics.success'],
          excludedFieldNames
        )
      ).not.toThrow();
    });

    test('should throw an error, when search field is part of the field to exclude', () => {
      expect(() =>
        validateSearchFields(
          ['name', 'tags', 'monitoring.execution.calculated_metrics.success_ratio'],
          excludedFieldNames
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"Search field monitoring.execution.calculated_metrics.success_ratio not supported"`
      );
    });
  });

  describe('validateFilterKueryNode', () => {
    test('should NOT throw an error, when filter does not contain any fields to exclude', () => {
      expect(() =>
        validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'alert.attributes.name: "Rule I" and alert.attributes.tags: "fast"'
          ),
          excludedFieldNames,
        })
      ).not.toThrow();
    });

    test('should NOT throw an error, when filter does not have any descendant of the field to exclude', () => {
      expect(() =>
        validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'alert.attributes.name: "Rule I" and alert.attributes.tags: "fast" and alert.attributes.new_field.monitoring.metrics.success > 50'
          ),
          excludedFieldNames,
        })
      ).not.toThrow();
    });

    test('should NOT throw an error, when filter contains params with validate properties', () => {
      expect(() =>
        validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'alert.attributes.name: "Rule I" and alert.attributes.tags: "fast" and alert.attributes.params.risk_score > 50'
          ),
          excludedFieldNames,
        })
      ).not.toThrow();
    });

    test('should modify the filter when valid mapped params are used', () => {
      const astFilter = esKuery.fromKueryExpression('alert.attributes.params.risk_score > 50');

      expect(astFilter.arguments[0].value).toEqual('alert.attributes.params.risk_score');

      validateFilterKueryNode({ astFilter, excludedFieldNames });

      expect(astFilter.arguments[0].value).toEqual('alert.attributes.mapped_params.risk_score');
    });

    test('should throw an error, when filter contains the field to exclude', () => {
      expect(() =>
        validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'alert.attributes.name: "Rule I" and alert.attributes.tags: "fast" and alert.attributes.monitoring.execution.calculated_metrics.success_ratio > 50'
          ),
          excludedFieldNames,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Filter is not supported on this field alert.attributes.monitoring.execution.calculated_metrics.success_ratio"`
      );
    });

    test('should throw an error, when a nested filter contains the field to exclude', () => {
      expect(() =>
        validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'alert.attributes.name: "Rule I" and alert.attributes.tags: "fast" and alert.attributes.actions:{ group: ".server-log" }'
          ),
          excludedFieldNames: ['actions'],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Filter is not supported on this field alert.attributes.actions"`
      );
    });

    test('should throw an error, when the filter contains a params property that is not validate', () => {
      expect(() =>
        validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'alert.attributes.name: "Rule I" and alert.attributes.tags: "fast" and alert.attributes.params.invalid > 50'
          ),
          excludedFieldNames,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Params filter is not support on this field alert.attributes.params.invalid"`
      );
    });
  });
});
