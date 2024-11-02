/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { getTermsAggregationFields } from '../../../../../../../rule_creation_ui/components/step_define_rule/utils';
import { isEsqlRule, isMlRule } from '../../../../../../../../../common/detection_engine/utils';
import { aggregatableFields } from '../../../../../../../rule_creation_ui/components/step_define_rule';
import { useAllEsqlRuleFields } from '../../../../../../../rule_creation_ui/hooks';
import { useMLRuleConfig } from '../../../../../../../../common/components/ml/hooks/use_ml_rule_config';
import type { RuleFieldEditComponentProps } from '../rule_field_edit_component_props';
import { useDiffableRuleDataView } from '../hooks/use_diffable_rule_data_view';
import { AlertSuppressionEdit } from './suppression_edit';
import * as i18n from './translations';

export function AlertSuppressionEditAdapter({
  finalDiffableRule,
}: RuleFieldEditComponentProps): JSX.Element {
  const { dataView } = useDiffableRuleDataView(finalDiffableRule);
  const { fields: esqlSuppressionFields, isLoading: isEsqlSuppressionLoading } =
    useAllEsqlRuleFields({
      esqlQuery: 'esql_query' in finalDiffableRule ? finalDiffableRule.esql_query.query : undefined,
      indexPatternsFields: dataView?.fields ?? [],
    });
  const machineLearningJobIds = useMemo(
    () =>
      'machine_learning_job_id' in finalDiffableRule
        ? [finalDiffableRule.machine_learning_job_id].flat()
        : [],
    [finalDiffableRule]
  );
  const {
    mlSuppressionFields,
    loading: mlRuleConfigLoading,
    allJobsStarted,
  } = useMLRuleConfig({
    machineLearningJobId: machineLearningJobIds,
  });
  const isMlSuppressionIncomplete =
    isMlRule(finalDiffableRule.type) && machineLearningJobIds.length > 0 && !allJobsStarted;

  const suppressibleFieldSpecs = useMemo(() => {
    if (isEsqlRule(finalDiffableRule.type)) {
      return esqlSuppressionFields;
    } else if (isMlRule(finalDiffableRule.type)) {
      return mlSuppressionFields;
    } else {
      return getTermsAggregationFields(aggregatableFields(dataView?.fields ?? []));
    }
  }, [finalDiffableRule.type, esqlSuppressionFields, mlSuppressionFields, dataView?.fields]);

  const disabledText = useMemo(() => {
    if (isMlRule(finalDiffableRule.type) && mlRuleConfigLoading) {
      return i18n.MACHINE_LEARNING_SUPPRESSION_FIELDS_LOADING;
    } else if (isMlRule(finalDiffableRule.type) && mlSuppressionFields.length === 0) {
      return i18n.MACHINE_LEARNING_NO_SUPPRESSION_FIELDS;
    } else if (isEsqlRule(finalDiffableRule.type) && isEsqlSuppressionLoading) {
      return i18n.ESQL_SUPPRESSION_FIELDS_LOADING;
    }
  }, [
    finalDiffableRule,
    mlRuleConfigLoading,
    mlSuppressionFields.length,
    isEsqlSuppressionLoading,
  ]);

  return (
    <AlertSuppressionEdit
      suppressibleFieldSpecs={suppressibleFieldSpecs}
      disabled={Boolean(disabledText)}
      disabledText={disabledText}
      warningText={
        isMlSuppressionIncomplete ? i18n.MACHINE_LEARNING_SUPPRESSION_INCOMPLETE_LABEL : undefined
      }
    />
  );
}
