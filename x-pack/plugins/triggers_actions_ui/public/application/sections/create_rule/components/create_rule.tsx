/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { withBulkRuleOperations } from '../../common/components/with_bulk_rule_api_operations';
import { withActionOperations } from '../../common/components/with_actions_api_operations';
import { useKibana } from '../../../../common/lib/kibana';
import { useLoadRuleTypesQuery } from '../../../hooks/use_load_rule_types_query';
import { CreateRuleForm } from './create_rule_form';

export const CreateRule = () => {
  const { actionTypeRegistry, ruleTypeRegistry } = useKibana().services;

  // Fetch rule types
  const { ruleTypesState } = useLoadRuleTypesQuery({ filteredRuleTypes: [] });

  return (
    <>
      <CreateRuleForm
        consumer={ALERTS_FEATURE_ID}
        actionTypeRegistry={actionTypeRegistry}
        ruleTypeRegistry={ruleTypeRegistry}
        ruleTypeIndex={ruleTypesState.data}
      />
    </>
  );
};

const CreateRuleWithApi = withActionOperations(withBulkRuleOperations(CreateRule));
// eslint-disable-next-line import/no-default-export
export { CreateRuleWithApi as default };
