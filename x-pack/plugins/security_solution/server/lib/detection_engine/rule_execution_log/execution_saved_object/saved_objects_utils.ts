/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuidv5 from 'uuid/v5';
import { SavedObjectReference } from 'src/core/server';
import { RULE_EXECUTION_SO_TYPE } from './saved_objects_type';

export const getRuleExecutionSoId = (ruleId: string): string => {
  // The uuidv5 namespace constant (uuidv5.DNS) is arbitrary.
  return uuidv5(`${RULE_EXECUTION_SO_TYPE}:${ruleId}`, uuidv5.DNS);
};

const RULE_REFERENCE_TYPE = 'alert';
const RULE_REFERENCE_NAME = 'alert_0';

export const getRuleExecutionSoReferences = (ruleId: string): SavedObjectReference[] => {
  return [
    {
      id: ruleId,
      type: RULE_REFERENCE_TYPE,
      name: RULE_REFERENCE_NAME,
    },
  ];
};

export const extractRuleIdFromReferences = (references: SavedObjectReference[]): string | null => {
  const foundReference = references.find(
    (r) => r.type === RULE_REFERENCE_TYPE && r.name === RULE_REFERENCE_NAME
  );

  return foundReference?.id || null;
};
