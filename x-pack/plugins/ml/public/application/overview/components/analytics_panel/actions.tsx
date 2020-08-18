/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, FC } from 'react';
import { EuiToolTip, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useNavigateToPath } from '../../../contexts/kibana';
import { getAnalysisType } from '../../../data_frame_analytics/common/analytics';
import {
  getResultsUrl,
  DataFrameAnalyticsListRow,
} from '../../../data_frame_analytics/pages/analytics_management/components/analytics_list/common';

interface Props {
  item: DataFrameAnalyticsListRow;
}

export const ViewLink: FC<Props> = ({ item }) => {
  const navigateToPath = useNavigateToPath();

  const clickHandler = useCallback(() => {
    const analysisType = getAnalysisType(item.config.analysis);
    navigateToPath(getResultsUrl(item.id, analysisType));
  }, []);

  const openJobsInAnomalyExplorerText = i18n.translate(
    'xpack.ml.overview.analytics.resultActions.openJobText',
    {
      defaultMessage: 'View job results',
    }
  );

  return (
    <EuiToolTip position="bottom" content={openJobsInAnomalyExplorerText}>
      <EuiButtonEmpty
        color="text"
        size="xs"
        onClick={clickHandler}
        iconType="visTable"
        aria-label={openJobsInAnomalyExplorerText}
        className="results-button"
        data-test-subj="mlAnalyticsJobViewButton"
      >
        {i18n.translate('xpack.ml.overview.analytics.viewActionName', {
          defaultMessage: 'View',
        })}
      </EuiButtonEmpty>
    </EuiToolTip>
  );
};
