/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core-capabilities-common';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

type FeatureCapabilities = Capabilities[string];

/**
 * Returns capabilities for a specific feature, or alternatively the entire capabilities object.
 * @param featureId ID of feature
 */
export function useCapabilities(): Capabilities;
export function useCapabilities<T extends FeatureCapabilities = FeatureCapabilities>(
  featureId: string
): T;
export function useCapabilities<T extends FeatureCapabilities = FeatureCapabilities>(
  featureId?: string
) {
  const { services } = useKibana<CoreStart>();

  if (featureId) {
    return services.application.capabilities[featureId] as T;
  }

  return services.application.capabilities;
}
