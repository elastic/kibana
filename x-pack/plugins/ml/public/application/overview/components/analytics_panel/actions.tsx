/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useMemo } from 'react';
import { EuiToolTip, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMlLink } from '../../../contexts/kibana';
import { getAnalysisType } from '../../../data_frame_analytics/common/analytics';
import { DataFrameAnalyticsListRow } from '../../../data_frame_analytics/pages/analytics_management/components/analytics_list/common';
import { getViewLinkStatus } from '../../../data_frame_analytics/pages/analytics_management/components/action_view/get_view_link_status';
import { ML_PAGES } from '../../../../../common/constants/ml_url_generator';
import { DataFrameAnalysisConfigType } from '../../../../../common/types/data_frame_analytics';

interface Props {
  item: DataFrameAnalyticsListRow;
}

export const ViewLink: FC<Props> = ({ item }) => {
  const { disabled, tooltipContent } = getViewLinkStatus(item);

  const viewJobResultsButtonText = i18n.translate(
    'xpack.ml.overview.analytics.resultActions.openJobText',
    {
      defaultMessage: 'View job results',
    }
  );

  const tooltipText = disabled === false ? viewJobResultsButtonText : tooltipContent;
  const analysisType = useMemo(() => getAnalysisType(item.config.analysis), [item]);

  const viewAnalyticsResultsLink = useMlLink({
    page: ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
    pageState: {
      jobId: item.id,
      analysisType: analysisType as DataFrameAnalysisConfigType,
    },
  });

  return (
    <EuiToolTip position="bottom" content={tooltipText}>
      <EuiButtonEmpty
        href={viewAnalyticsResultsLink}
        color="text"
        size="xs"
        iconType="visTable"
        aria-label={viewJobResultsButtonText}
        className="results-button"
        data-test-subj="mlOverviewAnalyticsJobViewButton"
        isDisabled={disabled}
      >
        {i18n.translate('xpack.ml.overview.analytics.viewActionName', {
          defaultMessage: 'View',
        })}
      </EuiButtonEmpty>
    </EuiToolTip>
  );
};
