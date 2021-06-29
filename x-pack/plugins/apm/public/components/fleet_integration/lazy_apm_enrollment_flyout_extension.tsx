/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { AgentEnrollmentFlyoutFinalStepExtensionComponent } from '../../../../fleet/public';

export const LazyApmEnrollmentFlyoutExtension = lazy<AgentEnrollmentFlyoutFinalStepExtensionComponent>(
  async () => {
    const { ApmEnrollmentFlyoutExtension } = await import(
      './apm_enrollment_flyout_extension'
    );

    return {
      default: ApmEnrollmentFlyoutExtension,
    };
  }
);
