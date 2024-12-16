/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { CreatePackagePolicyFromOnboardingHub } from './create_package_policy';
import { AgentEnrollmentFromOnboardingHub } from './agent_enrollment';
import { AddFleetServerStepFromOnboardingHub } from './add_fleet_server';
import { ConfirmDataStepFromOnboardingHub } from './confirm_incoming_data';
import { CheckFleetServerRequiredFromOnboardingHub } from './check_fleet_server_required';

const addIntegrationFromOnboardingHub = {
  title: i18n.translate('xpack.fleet.createFirstPackagePolicy.addIntegrationStepTitle', {
    defaultMessage: 'Add the integration',
  }),
  component: CreatePackagePolicyFromOnboardingHub,
};

const agentEnrollmentStepFromOnboardingHub = {
  title: i18n.translate('xpack.fleet.createFirstPackagePolicy.agentEnrollmentStepTitle', {
    defaultMessage: 'Add agent',
  }),
  component: AgentEnrollmentFromOnboardingHub,
};

const addFleetServerStepFromOnboardingHub = {
  title: i18n.translate('xpack.fleet.createFirstPackagePolicy.addFleetServerStepTitle', {
    defaultMessage: 'Add Fleet Server',
  }),
  component: AddFleetServerStepFromOnboardingHub,
};

const confirmDataStepFromOnboardingHub = {
  title: i18n.translate('xpack.fleet.createFirstPackagePolicy.confirmDataStepTitle', {
    defaultMessage: 'Confirm incoming data',
  }),
  component: ConfirmDataStepFromOnboardingHub,
};

const checkFleetServerRequirementsStep = {
  title: i18n.translate(
    'xpack.fleet.createFirstPackagePolicy.checkFleetServerRequirementsStepTitle',
    {
      defaultMessage: 'Check Fleet Server requirements',
    }
  ),
  component: CheckFleetServerRequiredFromOnboardingHub,
};

export const onboardingManagedSteps = [
  addIntegrationFromOnboardingHub,
  checkFleetServerRequirementsStep,
  addFleetServerStepFromOnboardingHub,
  agentEnrollmentStepFromOnboardingHub,
  confirmDataStepFromOnboardingHub,
];
