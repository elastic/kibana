/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { sloFeatureId } from '@kbn/observability-plugin/common';
import { useKibana } from '../utils/kibana_react';

export function useCapabilities() {
  const {
    application: { capabilities },
  } = useKibana().services;

  return {
    hasReadCapabilities: !!capabilities[sloFeatureId].read ?? false,
    hasWriteCapabilities: !!capabilities[sloFeatureId].write ?? false,
  };
}
