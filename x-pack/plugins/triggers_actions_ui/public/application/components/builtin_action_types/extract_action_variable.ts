/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromNullable, Option } from 'fp-ts/lib/Option';
import { ActionVariable } from '../../../types';

export function extractActionVariable(
  actionVariables: ActionVariable[],
  variableName: string
): Option<ActionVariable> {
  return fromNullable(actionVariables?.find((variable) => variable.name === variableName));
}
