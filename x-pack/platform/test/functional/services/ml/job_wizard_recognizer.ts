/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';
import type { MlCommonUI } from './common_ui';

export function MachineLearningJobWizardRecognizerProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI
) {
  const testSubjects = getService('testSubjects');

  return {
    async assertJobIdValue(expectedValue: string) {
      const actualJobPrefixId = await testSubjects.getAttribute(
        'mlJobRecognizerWizardInputJobIdPrefix',
        'value'
      );
      expect(actualJobPrefixId).to.eql(
        expectedValue,
        `Expected job id prefix value to be '${expectedValue}' (got '${actualJobPrefixId}')`
      );
    },

    async setJobIdPrefix(prefix: string) {
      await mlCommonUI.setValueWithChecks('mlJobRecognizerWizardInputJobIdPrefix', prefix, {
        clearWithKeyboard: true,
      });
      await this.assertJobIdValue(prefix);
    },
  };
}
