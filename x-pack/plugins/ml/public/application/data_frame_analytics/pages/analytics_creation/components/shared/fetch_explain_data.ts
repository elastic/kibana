/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractErrorProperties } from '@kbn/ml-error-utils';

import type {
  DfAnalyticsExplainResponse,
  FieldSelectionItem,
} from '@kbn/ml-data-frame-analytics-utils';
import { ml } from '../../../../../services/ml_api_service';
import type { State } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { getJobConfigFromFormState } from '../../../analytics_management/hooks/use_create_analytics_form/state';

export const fetchExplainData = async (formState: State['form']) => {
  const jobConfig = getJobConfigFromFormState(formState);
  let errorMessage = '';
  let errorReason = '';
  let success = true;
  let expectedMemory = '';
  let fieldSelection: FieldSelectionItem[] = [];
  let noDocsContainMappedFields = false;

  try {
    delete jobConfig.dest;
    delete jobConfig.model_memory_limit;
    delete jobConfig.analyzed_fields;
    const resp: DfAnalyticsExplainResponse = await ml.dataFrameAnalytics.explainDataFrameAnalytics(
      jobConfig
    );
    expectedMemory = resp.memory_estimation?.expected_memory_without_disk;
    fieldSelection = resp.field_selection || [];
  } catch (error) {
    const errObj = extractErrorProperties(error);
    success = false;
    errorMessage = errObj.message;
    if (errObj.causedBy) {
      errorReason = errObj.causedBy;
    }
  }

  if (
    errorMessage.includes('status_exception') &&
    errorMessage.includes('Unable to estimate memory usage as no documents')
  ) {
    noDocsContainMappedFields = true;
  }

  return {
    success,
    expectedMemory,
    fieldSelection,
    errorMessage,
    errorReason,
    noDocsContainMappedFields,
  };
};
