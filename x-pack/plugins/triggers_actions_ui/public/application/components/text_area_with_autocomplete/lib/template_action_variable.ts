/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionVariable } from '@kbn/alerting-plugin/common';

export function templateActionVariable(variable: ActionVariable) {
  return variable.useWithTripleBracesInTemplates
    ? `{{{${variable.name}}}}`
    : `{{${variable.name}}}`;
}
