/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ml } from '../../../../services/ml_api_service';
import { getToastNotifications } from '../../../../util/dependency_cache';
import { JOB_MAP_NODE_TYPES } from '../common';

interface Props {
  id: string;
  type: JOB_MAP_NODE_TYPES;
}

export const DeleteButton: FC<Props> = ({ id, type }) => {
  const toastNotifications = getToastNotifications();

  const onDelete = async () => {
    try {
      // if (isDataFrameAnalyticsFailed(d.stats.state)) {
      //   await ml.dataFrameAnalytics.stopDataFrameAnalytics(d.config.id, true);
      // }
      await ml.dataFrameAnalytics.deleteDataFrameAnalytics(id);
      toastNotifications.addSuccess(
        i18n.translate('xpack.ml.dataframe.analyticsMap.flyout.deleteAnalyticsSuccessMessage', {
          defaultMessage: 'Request to delete data frame analytics {id} acknowledged.',
          values: { id },
        })
      );
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.analyticsMap.flyout.deleteAnalyticsErrorMessage', {
          defaultMessage: 'An error occurred deleting the data frame analytics {id}: {error}',
          values: { id, error: JSON.stringify(e) },
        })
      );
    }
  };

  if (type !== JOB_MAP_NODE_TYPES.ANALYTICS) {
    return null;
  }

  return (
    <EuiButton onClick={onDelete} iconType="trash" color="danger" size="s">
      {i18n.translate('xpack.ml.dataframe.analyticsMap.flyout.deleteJobButton', {
        defaultMessage: 'Delete job',
      })}
    </EuiButton>
  );
};
