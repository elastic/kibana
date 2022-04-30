/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { removeNestedFieldChildren } from './new_job_capabilities_service_analytics';
import type { DataView } from '../../../../../../../src/plugins/data_views/public';

// there is magic happening here. starting the include name with `mock..`
// ensures it can be lazily loaded by the jest.mock function below.
import nestedFieldIndexResponse from '../__mocks__/nested_field_index_response.json';

const indexPattern = {
  id: 'nested-field-index',
  title: 'nested-field-index',
} as unknown as DataView;

describe('removeNestedFieldChildren', () => {
  describe('cloudwatch newJobCapsAnalytics()', () => {
    it('can get job caps fields from endpoint json', async () => {
      // @ts-ignore
      const fields = removeNestedFieldChildren(nestedFieldIndexResponse, indexPattern.title);
      const nestedField = fields.find(({ type }) => type === 'nested');
      const nestedFieldRoot = nestedField?.name;
      const regex = new RegExp(`^${nestedFieldRoot}\\.`, 'i');

      expect(fields).toHaveLength(4);
      expect(fields.some((field) => field.name.match(regex))).toBe(false);
    });
  });
});
