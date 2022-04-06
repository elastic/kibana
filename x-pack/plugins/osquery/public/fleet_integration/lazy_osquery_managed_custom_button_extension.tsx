/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { PackageCustomExtensionComponent } from '../../../fleet/public';

export const LazyOsqueryManagedCustomButtonExtension = lazy<PackageCustomExtensionComponent>(
  async () => {
    const { OsqueryManagedCustomButtonExtension } = await import(
      './osquery_managed_custom_button_extension'
    );

    return {
      default: OsqueryManagedCustomButtonExtension,
    };
  }
);
