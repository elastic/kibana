/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  SloCreateFlyoutToken,
  SloDetailsFlyoutToken,
  type CreateSLOFormFlyoutProps,
  type SLODetailsFlyoutProps,
} from '@kbn/slo-flyout-types';
import type { ComponentType, FunctionComponent } from 'react';
import type { ApmPluginStartDeps } from '../plugin';

interface SloFlyouts {
  CreateSLOFormFlyout: FunctionComponent<CreateSLOFormFlyoutProps> | undefined;
  SLODetailsFlyout: ComponentType<SLODetailsFlyoutProps> | undefined;
}

/**
 * Resolves SLO flyout components from the DI container via {@link Global} tokens.
 *
 * This replaces the former `useKibana().services.slo?.getCreateSLOFormFlyout`
 * pattern.  The SLO plugin publishes its flyout factories globally, so APM
 * no longer needs `slo` in `optionalPlugins`.
 */
export const useSloFlyouts = (): SloFlyouts => {
  const { injection } = useKibana<ApmPluginStartDeps>().services;

  return useMemo(() => {
    const container = injection?.getContainer();

    return {
      CreateSLOFormFlyout: container?.get(SloCreateFlyoutToken, { optional: true }),
      SLODetailsFlyout: container?.get(SloDetailsFlyoutToken, { optional: true }),
    };
  }, [injection]);
};
