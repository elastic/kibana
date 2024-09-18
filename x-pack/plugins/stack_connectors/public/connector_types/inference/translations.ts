/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INPUT_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.inference.requiredInputTextField',
  {
    defaultMessage: 'Input is required.',
  }
);

export const QUERY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.inference.requiredQueryTextField',
  {
    defaultMessage: 'Query is required.',
  }
);

export const INPUT_TYPE_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.inference.requiredInpuTypeTextField',
  {
    defaultMessage: 'Input type is required.',
  }
);

export const INPUT_INVALID = i18n.translate(
  'xpack.stackConnectors.security.inference.params.error.invalidInputText',
  {
    defaultMessage: 'Input does not have a valid Array format.',
  }
);

export const ACTION_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.inference.requiredActionText',
  {
    defaultMessage: 'Action is required.',
  }
);

export const INVALID_ACTION = i18n.translate(
  'xpack.stackConnectors.components.inference.invalidActionText',
  {
    defaultMessage: 'Invalid action name.',
  }
);

export const BODY = i18n.translate('xpack.stackConnectors.components.inference.bodyFieldLabel', {
  defaultMessage: 'Body',
});

export const INPUT = i18n.translate(
  'xpack.stackConnectors.components.inference.completionInputLabel',
  {
    defaultMessage: 'Input',
  }
);

export const QUERY = i18n.translate('xpack.stackConnectors.components.inference.rerankQueryLabel', {
  defaultMessage: 'Query',
});

export const BODY_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.inference.bodyCodeEditorAriaLabel',
  {
    defaultMessage: 'Code editor',
  }
);

export const TASK_TYPE = i18n.translate(
  'xpack.stackConnectors.components.inference.taskTypeFieldLabel',
  {
    defaultMessage: 'Task type',
  }
);

export const PROVIDER = i18n.translate(
  'xpack.stackConnectors.components.inference.providerFieldLabel',
  {
    defaultMessage: 'Provider',
  }
);

export const PROVIDER_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.inference.error.requiredProviderText',
  {
    defaultMessage: 'Provider is required.',
  }
);

export const DOCUMENTATION = i18n.translate(
  'xpack.stackConnectors.components.inference.documentation',
  {
    defaultMessage: 'Inference API documentation',
  }
);

export const NO_HISTORY_EMPTY_MESSAGE = i18n.translate(
  'xpack.securitySolution.commandInputHistory.noHistoryEmptyMessage',
  { defaultMessage: 'No commands have been entered' }
);

export const SELECT_PROVIDER = i18n.translate(
  'xpack.stackConnectors.components.inference.selectProvider',
  {
    defaultMessage: 'Select a service',
  }
);

export const COPY_TOOLTIP = i18n.translate(
  'xpack.stackConnectors.components.inference.copy.tooltip',
  {
    defaultMessage: 'Copy to clipboard',
  }
);

export const COPIED_TOOLTIP = i18n.translate(
  'xpack.stackConnectors.components.inference.copied.tooltip',
  {
    defaultMessage: 'Copied!',
  }
);
