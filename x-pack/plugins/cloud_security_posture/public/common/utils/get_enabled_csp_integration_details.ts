/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { PostureInput } from '../../../common/types';
import { SUPPORTED_CLOUDBEAT_INPUTS } from '../../../common/constants';
import { cloudPostureIntegrations, type CloudPostureIntegrations } from '../constants';

const isPolicyTemplate = (name: unknown): name is keyof CloudPostureIntegrations =>
  typeof name === 'string' && name in cloudPostureIntegrations;

export const getEnabledCspIntegrationDetails = (packageInfo?: PackagePolicy) => {
  const enabledInput = packageInfo?.inputs.find((input) => input.enabled);

  // Check for valid and support input
  if (
    !enabledInput ||
    !isPolicyTemplate(enabledInput.policy_template) ||
    !SUPPORTED_CLOUDBEAT_INPUTS.includes(enabledInput.type as PostureInput)
  )
    return null;

  const integration = cloudPostureIntegrations[enabledInput.policy_template];
  const enabledIntegrationOption = integration.options.find(
    (option) => option.type === enabledInput.type
  );

  return { integration, enabledIntegrationOption };
};
