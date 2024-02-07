/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PackagePolicyReplaceDefineStepExtensionComponent } from '@kbn/fleet-plugin/public/types';
import { lazy } from 'react';
import { CustomCriblForm } from './custom_cribl_form';

export const LazyCustomCriblExtension = lazy<PackagePolicyReplaceDefineStepExtensionComponent>(
  async () => {
    return {
      default: CustomCriblForm,
    };
  }
);
