/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EQUATION_HELP_MESSAGE = i18n.translate(
  'xpack.observability.threshold.rule.alertFlyout.customEquationEditor.equationHelpMessage',
  {
    defaultMessage:
      'Supports basic math equations, valid charaters are: A-Z, +, -, /, *, (, ), ?, !, &, :, |, >, <, =',
  }
);

export const LABEL_LABEL = i18n.translate(
  'xpack.observability.threshold.rule.alertFlyout.customEquationEditor.labelLabel',
  { defaultMessage: 'Label (optional)' }
);

export const LABEL_HELP_MESSAGE = i18n.translate(
  'xpack.observability.threshold.rule.alertFlyout.customEquationEditor.labelHelpMessage',
  {
    defaultMessage: 'Custom label will show on the alert chart and in reason',
  }
);

export const CUSTOM_EQUATION = i18n.translate(
  'xpack.observability.threshold.rule.alertFlyout.customEquation',
  {
    defaultMessage: 'Custom equation',
  }
);

export const DELETE_LABEL = i18n.translate(
  'xpack.observability.threshold.rule.alertFlyout.customEquationEditor.deleteRowButton',
  { defaultMessage: 'Delete' }
);

export const AGGREGATION_LABEL = (name: string) =>
  i18n.translate(
    'xpack.observability.threshold.rule.alertFlyout.customEquationEditor.aggregationLabel',
    {
      defaultMessage: 'Aggregation {name}',
      values: { name },
    }
  );
