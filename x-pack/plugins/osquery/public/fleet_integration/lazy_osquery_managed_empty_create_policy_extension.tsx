/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { PackagePolicyCreateExtensionComponent } from '../../../fleet/public';

export const LazyOsqueryManagedEmptyCreatePolicyExtension = lazy<PackagePolicyCreateExtensionComponent>(
  async () => {
    const { OsqueryManagedEmptyCreatePolicyExtension } = await import(
      './osquery_managed_empty_create_policy_extension'
    );
    return {
      default: OsqueryManagedEmptyCreatePolicyExtension,
    };
  }
);
