/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromNullable, Option } from 'fp-ts/lib/Option';
import { ActionVariable } from '@kbn/alerting-plugin/common';

export function extractActionVariable(
  actionVariables: ActionVariable[],
  variableName: string
): Option<ActionVariable> {
  return fromNullable(actionVariables?.find((variable) => variable.name === variableName));
}
