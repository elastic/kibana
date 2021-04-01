/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { PackagePolicyEditExtensionComponent } from '../../../fleet/public';

export const LazyOsqueryManagedEmptyEditPolicyExtension = lazy<PackagePolicyEditExtensionComponent>(
  async () => {
    const { OsqueryManagedEmptyEditPolicyExtension } = await import(
      './osquery_managed_empty_edit_policy_extension'
    );
    return {
      default: OsqueryManagedEmptyEditPolicyExtension,
    };
  }
);
