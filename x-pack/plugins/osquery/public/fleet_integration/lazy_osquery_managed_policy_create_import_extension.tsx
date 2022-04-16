/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { PackagePolicyCreateExtensionComponent } from '@kbn/fleet-plugin/public';

export const LazyOsqueryManagedPolicyCreateImportExtension =
  lazy<PackagePolicyCreateExtensionComponent>(async () => {
    const { OsqueryManagedPolicyCreateImportExtension } = await import(
      './osquery_managed_policy_create_import_extension'
    );
    return {
      default: OsqueryManagedPolicyCreateImportExtension,
    };
  });
