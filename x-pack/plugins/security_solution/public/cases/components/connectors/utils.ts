/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CasesConfigurationMapping } from '../../../cases/containers/configure/types';

import { ThirdPartyField } from './types';

export const createDefaultMapping = (
  fields: Record<string, ThirdPartyField>
): CasesConfigurationMapping[] =>
  Object.keys(fields).map(
    (key) =>
      ({
        source: fields[key].defaultSourceField,
        target: key,
        actionType: fields[key].defaultActionType,
      } as CasesConfigurationMapping)
  );
