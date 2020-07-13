/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { get } from 'lodash/fp';
import {
  Meta,
  Name,
  RuleNameOverrideOrUndefined,
} from '../../../../../common/detection_engine/schemas/common/schemas';
import { SignalSourceHit } from '../types';

interface BuildRuleNameFromMappingProps {
  doc: SignalSourceHit;
  ruleName: Name;
  ruleNameMapping: RuleNameOverrideOrUndefined;
}

interface BuildRuleNameFromMappingReturn {
  ruleName: Name;
  ruleNameMeta: Meta; // TODO: Stricter types
}

export const buildRuleNameFromMapping = ({
  doc,
  ruleName,
  ruleNameMapping,
}: BuildRuleNameFromMappingProps): BuildRuleNameFromMappingReturn => {
  if (ruleNameMapping != null) {
    // TODO: Expand by verifying fieldType from index via doc._index
    const mappedValue = get(ruleNameMapping, doc._source);
    if (t.string.is(mappedValue)) {
      return { ruleName: mappedValue, ruleNameMeta: { ruleNameOverridden: true } };
    }
  }

  return { ruleName, ruleNameMeta: {} };
};
