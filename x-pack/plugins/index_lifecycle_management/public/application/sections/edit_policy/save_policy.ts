/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';

import { SerializedPolicy } from '../../../../common/types';

import { UIM_POLICY_CREATE, UIM_POLICY_UPDATE } from '../../constants';

import { toasts } from '../../services/notification';
import { savePolicy as savePolicyApi } from '../../services/api';
import { getUiMetricsForPhases, trackUiMetric } from '../../services/ui_metric';
import { showApiError } from '../../services/api_errors';

export const savePolicy = async (
  serializedPolicy: SerializedPolicy,
  isNew: boolean
): Promise<boolean> => {
  try {
    await savePolicyApi(serializedPolicy);
  } catch (err) {
    const title = i18n.translate('xpack.indexLifecycleMgmt.editPolicy.saveErrorMessage', {
      defaultMessage: 'Error saving lifecycle policy {lifecycleName}',
      values: { lifecycleName: serializedPolicy.name },
    });
    showApiError(err, title);
    return false;
  }

  const uiMetrics = getUiMetricsForPhases(serializedPolicy.phases);
  uiMetrics.push(isNew ? UIM_POLICY_CREATE : UIM_POLICY_UPDATE);
  trackUiMetric(METRIC_TYPE.COUNT, uiMetrics);

  const message = i18n.translate('xpack.indexLifecycleMgmt.editPolicy.successfulSaveMessage', {
    defaultMessage: '{verb} lifecycle policy "{lifecycleName}"',
    values: {
      verb: isNew
        ? i18n.translate('xpack.indexLifecycleMgmt.editPolicy.createdMessage', {
            defaultMessage: 'Created',
          })
        : i18n.translate('xpack.indexLifecycleMgmt.editPolicy.updatedMessage', {
            defaultMessage: 'Updated',
          }),
      lifecycleName: serializedPolicy.name,
    },
  });
  toasts.addSuccess(message);
  return true;
};
