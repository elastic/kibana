/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningJobDetailsFlyoutProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async assertJobDetailsFlyoutExists() {
      await testSubjects.existOrFail('analyticsDetailsFlyout');
    },
    async assertJobDetailsFlyoutIdExists(id: string) {
      await testSubjects.existOrFail(`analyticsDetailsFlyout-${id}`);
    },
    async closeDetailsPanel() {
      await testSubjects.click('euiFlyoutCloseButton');
      await testSubjects.missingOrFail('analyticsDetailsFlyout');
    },
  };
}
