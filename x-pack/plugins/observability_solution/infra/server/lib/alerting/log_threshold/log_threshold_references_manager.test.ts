/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { Comparator, RuleParams } from '../../../../common/alerting/logs/log_threshold';
import { extractReferences, injectReferences } from './log_threshold_references_manager';

const params: RuleParams = {
  logView: {
    logViewId: 'Default',
    type: 'log-view-reference',
  },
  count: {
    comparator: Comparator.GT_OR_EQ,
    value: 1,
  },
  timeUnit: 'm',
  timeSize: 5,
  criteria: [
    {
      field: 'env',
      comparator: Comparator.NOT_EQ,
      value: 'dev',
    },
  ],
};

const paramsWithReferenceName = {
  ...params,
  logView: {
    ...params.logView,
    logViewId: 'log-view-reference-0',
  },
};

const brokenParams = {
  ...params,
  logView: {
    logViewId: 'random',
    type: 'log-view-reference-randon-type',
  },
};

const references: SavedObjectReference[] = [
  {
    name: 'log-view-reference-0',
    type: 'infrastructure-monitoring-log-view',
    id: 'Default',
  },
];

describe('Log threshold references manager', () => {
  describe('extractReferences', () => {
    it('should return the extracted references and update the logViewId with reference name', () => {
      expect(extractReferences(params)).toEqual({
        params: paramsWithReferenceName,
        references,
      });
    });

    it('should return the input params and an empty references when params are not valid', () => {
      expect(extractReferences(brokenParams as RuleParams)).toEqual({
        params: brokenParams,
        references: [],
      });
    });
  });

  describe('injectReferences', () => {
    it('should return updated params with the matched reference id from the references list', () => {
      expect(injectReferences(paramsWithReferenceName, references)).toEqual(params);
    });

    it('should throw an error if no reference match by name is found', () => {
      const invalidCaller = () =>
        injectReferences(paramsWithReferenceName, [
          {
            name: 'random-name',
            type: 'infrastructure-monitoring-log-view',
            id: 'Default',
          },
        ]);

      expect(invalidCaller).toThrow('Could not find reference for log-view-reference-0');
    });
  });

  describe('extractReferences and injectReferences', () => {
    it('should have a complementary effect on the params object', () => {
      const extracted = extractReferences(params);

      const updatedParams = injectReferences(extracted.params, extracted.references);

      expect(updatedParams).toEqual(params);
    });
  });
});
