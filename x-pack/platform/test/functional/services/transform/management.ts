/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { TRANSFORM_FUNCTION, type TransformFunction } from '@kbn/transform-plugin/common/constants';

import type { ProvidedType } from '@kbn/test';
import type { FtrProviderContext } from '../../ftr_provider_context';

export type TransformManagement = ProvidedType<typeof TransformManagementProvider>;

export function TransformManagementProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async assertTransformListPageExists() {
      await testSubjects.existOrFail('transformPageTransformList');
    },

    async assertNoTransformsFoundMessageExists() {
      await testSubjects.existOrFail('transformNoTransformsFound');
    },

    async assertTransformsTableExists() {
      await testSubjects.existOrFail('~transformListTable');
    },

    async assertCreateFirstTransformButtonExists() {
      await testSubjects.existOrFail('transformButtonCreate');
    },

    async assertTransformsReauthorizeCalloutExists() {
      await testSubjects.existOrFail('transformPageReauthorizeCallout');
    },

    async assertCreateFirstTransformButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('transformButtonCreate');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "Create first transform" button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async assertCreateNewTransformButtonExists() {
      await testSubjects.existOrFail('transformButtonCreate');
    },

    async assertCreateNewTransformButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('transformButtonCreate');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "Create a transform" button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async assertTransformStatsBarExists() {
      await testSubjects.existOrFail('transformStatsBar');
    },

    async startTransformCreation(transformFunction: TransformFunction = TRANSFORM_FUNCTION.PIVOT) {
      await testSubjects.click('transformButtonCreate');
      await testSubjects.existOrFail('transformCreatePopover');
      await testSubjects.click(
        transformFunction === TRANSFORM_FUNCTION.LATEST
          ? 'transformCreateLatestButton'
          : 'transformCreatePivotButton'
      );
      await testSubjects.existOrFail('transformPageCreateTransform');
    },
  };
}
