/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

import { TransformAPIProvider } from './api';
import { TransformTableProvider } from './transform_table';

export function MlDocsTransformProvider(context: FtrProviderContext) {
  const pageObjects = context.getPageObjects(['common']);
  const testSubjects = context.getService('testSubjects');

  return {
    api: TransformAPIProvider(context),
    table: TransformTableProvider(context),

    async navigateTo() {
      return await pageObjects.common.navigateToApp('transform');
    },

    async assertTransformListPageExists() {
      await testSubjects.existOrFail('transformPageTransformList');
    },

    async assertDefineStepActive() {
      await testSubjects.existOrFail('transformStepDefineForm');
    },
  };
}
