/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEmpty } from 'lodash/fp';

import { IMitreAttack } from '../../../pages/detection_engine/rules/types';

export const isMitreAttackInvalid = (
  tacticName: string | null | undefined,
  technique: IMitreAttack[] | null | undefined
) => {
  if (isEmpty(tacticName) || (tacticName !== 'none' && isEmpty(technique))) {
    return true;
  }
  return false;
};
