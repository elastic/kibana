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
import { getViewLinkStatus } from '../../../data_frame_analytics/pages/analytics_management/components/action_view/get_view_link_status';

interface Props {
  item: DataFrameAnalyticsListRow;
}

export const ViewLink: FC<Props> = ({ item }) => {
  const navigateToPath = useNavigateToPath();

  const clickHandler = useCallback(() => {
    const analysisType = getAnalysisType(item.config.analysis);
    navigateToPath(getResultsUrl(item.id, analysisType));
  }, []);

  const { disabled, tooltipContent } = getViewLinkStatus(item);

  const viewJobResultsButtonText = i18n.translate(
    'xpack.ml.overview.analytics.resultActions.openJobText',
    {
      defaultMessage: 'View job results',
    }
  );

  const tooltipText = disabled === false ? viewJobResultsButtonText : tooltipContent;

  return (
    <EuiToolTip position="bottom" content={tooltipText}>
      <EuiButtonEmpty
        color="text"
        size="xs"
        onClick={clickHandler}
        iconType="visTable"
        aria-label={viewJobResultsButtonText}
        className="results-button"
        data-test-subj="mlAnalyticsJobViewButton"
        isDisabled={disabled}
      >
        {i18n.translate('xpack.ml.overview.analytics.viewActionName', {
          defaultMessage: 'View',
        })}
      </EuiButtonEmpty>
    </EuiToolTip>
  );
};
