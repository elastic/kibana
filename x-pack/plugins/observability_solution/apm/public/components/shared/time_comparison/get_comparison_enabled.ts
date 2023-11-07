/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreStart } from '@kbn/core/public';
import { enableComparisonByDefault } from '@kbn/observability-plugin/public';

export function getComparisonEnabled({
  core,
  urlComparisonEnabled,
}: {
  core: CoreStart;
  urlComparisonEnabled?: boolean;
}) {
  const isEnabledByDefault = core.uiSettings.get<boolean>(
    enableComparisonByDefault
  );

  return urlComparisonEnabled ?? isEnabledByDefault;
}
