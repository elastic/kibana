/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from '@kbn/core-saved-objects-common';
import { logViewSavedObjectName } from '../../../saved_objects';
import { RuleParams, ruleParamsRT } from '../../../../common/alerting/logs/log_threshold';
import { logViewReferenceRT } from '../../../../common/log_views';
import { decodeOrThrow } from '../../../../common/runtime_types';

export const LOG_VIEW_REFERENCE_NAME = 'log-view-reference-0';

export const extractReferences = (params: RuleParams) => {
  if (!logViewReferenceRT.is(params.logView)) {
    return { params, references: [] };
  }

  const references: SavedObjectReference[] = [
    {
      name: LOG_VIEW_REFERENCE_NAME,
      type: logViewSavedObjectName,
      id: params.logView.logViewId,
    },
  ];

  const newParams = {
    ...params,
    logView: {
      ...params.logView,
      logViewId: LOG_VIEW_REFERENCE_NAME,
    },
  };

  return { params: newParams, references };
};

export const injectReferences = (params: RuleParams, references: SavedObjectReference[]) => {
  const decodedParams = decodeOrThrow(ruleParamsRT)(params);

  if (!logViewReferenceRT.is(decodedParams.logView)) {
    return decodedParams;
  }

  const matchedReference = references.find((ref) => ref.name === LOG_VIEW_REFERENCE_NAME);

  if (!matchedReference) {
    throw new Error(`Could not find reference for ${LOG_VIEW_REFERENCE_NAME}`);
  }

  return {
    ...decodedParams,
    logView: {
      ...decodedParams.logView,
      logViewId: matchedReference.id,
    },
  };
};
