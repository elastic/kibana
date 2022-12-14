/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const duplicate = i18n.translate('xpack.cloudDefend.controlDuplicate', {
  defaultMessage: 'Duplicate',
});

export const remove = i18n.translate('xpack.cloudDefend.controlRemove', {
  defaultMessage: 'Remove',
});

export const selectors = i18n.translate('xpack.cloudDefend.controlSelectors', {
  defaultMessage: 'Selectors',
});

export const selectorsHelp = i18n.translate('xpack.cloudDefend.controlSelectorsHelp', {
  defaultMessage: 'Create selectors to match on activities that should be blocked or alerted.',
});

export const responses = i18n.translate('xpack.cloudDefend.controlResponses', {
  defaultMessage: 'Responses',
});

export const responsesHelp = i18n.translate('xpack.cloudDefend.controlResponsesHelp', {
  defaultMessage:
    'Responses are evaluated from top to bottom. At most, one set of actions will be performed.',
});

export const name = i18n.translate('xpack.cloudDefend.name', {
  defaultMessage: 'Name',
});

export const errorDuplicateName = i18n.translate('xpack.cloudDefend.errorDuplicateName', {
  defaultMessage: 'This name is already used by another selector.',
});

export const errorInvalidName = i18n.translate('xpack.cloudDefend.errorInvalidName', {
  defaultMessage: 'Selector names must be alpha numeric and contain no spaces.',
});

export const activity = i18n.translate('xpack.cloudDefend.activity', {
  defaultMessage: 'Activity',
});

export const containerImageName = i18n.translate('xpack.cloudDefend.containerImageName', {
  defaultMessage: 'Container image name',
});

export const containerImageTag = i18n.translate('xpack.cloudDefend.containerImageTag', {
  defaultMessage: 'Container image tag',
});

export const filePath = i18n.translate('xpack.cloudDefend.filePath', {
  defaultMessage: 'File path',
});

export const orchestratorClusterId = i18n.translate('xpack.cloudDefend.orchestratorClusterId', {
  defaultMessage: 'Orchestrator cluster ID',
});

export const orchestratorClusterName = i18n.translate('xpack.cloudDefend.orchestratorClusterName', {
  defaultMessage: 'Orchestrator cluster name',
});

export const orchestratorNamespace = i18n.translate('xpack.cloudDefend.orchestratorNamespace', {
  defaultMessage: 'Orchestrator namespace',
});

export const orchestratorResourceLabel = i18n.translate(
  'xpack.cloudDefend.orchestratorResourceLabel',
  {
    defaultMessage: 'Orchestrator resource label',
  }
);

export const orchestratorResourceName = i18n.translate(
  'xpack.cloudDefend.orchestratorResourceName',
  {
    defaultMessage: 'Orchestrator resource name',
  }
);

export const orchestratorResourceType = i18n.translate(
  'xpack.cloudDefend.orchestratorResourceType',
  {
    defaultMessage: 'Orchestrator resource type',
  }
);
