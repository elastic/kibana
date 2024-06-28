/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

export enum AgentConfigurationPageStep {
  ChooseService = 'choose-service-step',
  ChooseSettings = 'choose-settings-step',
  Review = 'review-step',
}

export const agentConfigurationPageStepRt = t.union([
  t.literal(AgentConfigurationPageStep.ChooseService),
  t.literal(AgentConfigurationPageStep.ChooseSettings),
  t.literal(AgentConfigurationPageStep.Review),
]);
