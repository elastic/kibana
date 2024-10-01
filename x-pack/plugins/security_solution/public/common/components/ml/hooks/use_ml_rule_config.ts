/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataViewFieldBase } from '@kbn/es-query';
import type { FieldSpec } from '@kbn/data-plugin/common';

import { getTermsAggregationFields } from '../../../../detection_engine/rule_creation_ui/components/step_define_rule/utils';
import { useRuleFields } from '../../../../detection_engine/rule_management/logic/use_rule_fields';
import { useMlCapabilities } from './use_ml_capabilities';
import { useMlRuleValidations } from './use_ml_rule_validations';
import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';

export interface UseMlRuleConfigReturn {
  hasMlAdminPermissions: boolean;
  hasMlLicense: boolean;
  loading: boolean;
  mlFields: DataViewFieldBase[];
  mlSuppressionFields: FieldSpec[];
  allJobsStarted: boolean;
}

/**
 * This hook is used to retrieve the various configurations and status needed for creating/editing an ML Rule in the Detection Engine UI. It composes several other ML hooks.
 *
 * @param machineLearningJobId The ID(s) of the ML job to retrieve the configuration for
 *
 * @returns {UseMlRuleConfigReturn} An object containing the various configurations and statuses needed for creating/editing an ML Rule
 *
 */
export const useMLRuleConfig = ({
  machineLearningJobId,
}: {
  machineLearningJobId: string[] | undefined;
}): UseMlRuleConfigReturn => {
  const mlCapabilities = useMlCapabilities();
  const { loading: validationsLoading, allJobsStarted } = useMlRuleValidations({
    machineLearningJobId,
  });
  const { loading: mlFieldsLoading, fields: mlFields } = useRuleFields({
    machineLearningJobId,
  });
  const mlSuppressionFields = useMemo(
    () => getTermsAggregationFields(mlFields as FieldSpec[]),
    [mlFields]
  );

  return {
    hasMlAdminPermissions: hasMlAdminPermissions(mlCapabilities),
    hasMlLicense: hasMlLicense(mlCapabilities),
    mlFields,
    loading: validationsLoading || mlFieldsLoading,
    mlSuppressionFields,
    allJobsStarted,
  };
};
