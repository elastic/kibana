/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule as UIRule } from '@kbn/securitysolution-exception-list-components';
import type { Rule } from '../../../../rule_management/logic/types';

export const mapListRulesToUIRules = (listRules: Rule[]): UIRule[] | [] => {
  if (!listRules.length) return [];
  return listRules.map((listRule) => ({
    name: listRule.name,
    id: listRule.id,
    rule_id: listRule.rule_id,
    exception_list: listRule.exceptions_list,
  }));
};
