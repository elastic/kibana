/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PackagePolicy } from '@kbn/fleet-plugin/common';
import { cloudPostureIntegrations, CloudPostureIntegrations } from '../constants';

const isPolicyTemplate = (name: unknown): name is keyof CloudPostureIntegrations =>
  typeof name === 'string' && name in cloudPostureIntegrations;

export const getEnabledCspIntegrationDetails = (packageInfo?: PackagePolicy) => {
  const enabledInput = packageInfo?.inputs.find((input) => input.enabled);
  if (!enabledInput || !isPolicyTemplate(enabledInput.policy_template)) return null;

  const integration = cloudPostureIntegrations[enabledInput.policy_template];
  const enabledIntegrationOption = integration.options.find(
    (option) => option.type === enabledInput.type
  );

  return { integration, enabledIntegrationOption };
};
