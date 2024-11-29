/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { GetWorkflowInsightsRequestSchema } from './get_insights';

describe('GetWorkflowInsightsRequestSchema', () => {
  const validateQuery = (query: Record<string, unknown>) => {
    return schema.object(GetWorkflowInsightsRequestSchema).validate(query);
  };

  it('should validate successfully with valid parameters', () => {
    const validQuery = {
      query: {
        size: 10,
        from: 0,
        ids: ['valid-id-1', 'valid-id-2'],
        categories: ['endpoint'],
        types: ['incompatible_antivirus'],
        sourceTypes: ['llm-connector'],
        sourceIds: ['source-1', 'source-2'],
        targetTypes: ['endpoint'],
        targetIds: ['target-1', 'target-2'],
        actionTypes: ['refreshed', 'remediated'],
      },
    };

    expect(() => validateQuery(validQuery)).not.toThrow();
  });

  it('should throw an error if required fields are missing', () => {
    const invalidQuery = {
      query: {
        size: 10,
      },
    };

    expect(() => validateQuery(invalidQuery)).toThrowErrorMatchingInlineSnapshot(
      '"[query.actionTypes]: expected value of type [array] but got [undefined]"'
    );
  });

  it('should throw an error for invalid types', () => {
    const invalidQuery = {
      query: {
        size: 'not-a-number', // Invalid size
        actionTypes: ['invalid-action'], // Invalid action type
      },
    };

    expect(() => validateQuery(invalidQuery)).toThrowErrorMatchingInlineSnapshot(
      '"[query.size]: expected value of type [number] but got [string]"'
    );
  });

  it('should throw an error if ids contain empty strings', () => {
    const invalidQuery = {
      query: {
        ids: ['valid-id', ''],
        actionTypes: ['refreshed'],
      },
    };

    expect(() => validateQuery(invalidQuery)).toThrowErrorMatchingInlineSnapshot(
      '"[query.ids.1]: value has length [0] but it must have a minimum length of [1]."'
    );
  });

  it('should throw an error if sourceIds contain empty strings', () => {
    const invalidQuery = {
      query: {
        sourceIds: ['valid-source', ' '],
        actionTypes: ['refreshed'],
      },
    };

    expect(() => validateQuery(invalidQuery)).toThrowErrorMatchingInlineSnapshot(
      '"[query.sourceIds.1]: sourceId can not be an empty string"'
    );
  });

  it('should validate successfully when optional fields are omitted', () => {
    const validQuery = {
      query: {
        actionTypes: ['refreshed'],
      },
    };

    expect(() => validateQuery(validQuery)).not.toThrow();
  });

  it('should throw an error for unsupported categories or types', () => {
    const invalidQuery = {
      query: {
        categories: ['unsupported-category'],
        types: ['unsupported-type'],
        actionTypes: ['refreshed'],
      },
    };

    expect(() => validateQuery(invalidQuery)).toThrowErrorMatchingInlineSnapshot(
      '"[query.categories.0]: expected value to equal [endpoint]"'
    );
  });
});
