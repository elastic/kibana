/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { useMlHref, ML_PAGES } from '@kbn/ml-plugin/public';
import { shouldHandleLinkEvent } from '@kbn/observability-plugin/public';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { TimeRange } from '../../../../../../common/time/time_range';
import { partitionField } from '../../../../../../common/log_analysis/job_parameters';

export const AnalyzeCategoryDatasetInMlAction: React.FunctionComponent<{
  categorizationJobId: string;
  categoryId: number;
  dataset: string;
  timeRange: TimeRange;
}> = ({ categorizationJobId, categoryId, dataset, timeRange }) => {
  const {
    services: { ml, http, application },
  } = useKibanaContextForPlugin();

  const viewAnomalyInMachineLearningLink = useMlHref(ml, http.basePath.get(), {
    page: ML_PAGES.SINGLE_METRIC_VIEWER,
    pageState: {
      jobIds: [categorizationJobId],
      timeRange: {
        from: moment(timeRange.startTime).format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
        to: moment(timeRange.endTime).format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
        mode: 'absolute',
      },
      entities: {
        [partitionField]: dataset,
        mlcategory: `${categoryId}`,
      },
    },
  });

  const handleClick = useCallback(
    (e) => {
      if (!viewAnomalyInMachineLearningLink || !shouldHandleLinkEvent(e)) return;
      application.navigateToUrl(viewAnomalyInMachineLearningLink);
    },
    [application, viewAnomalyInMachineLearningLink]
  );

  return (
    <EuiToolTip content={analyseCategoryDatasetInMlTooltipDescription} delay="long">
      <EuiButtonIcon
        aria-label={analyseCategoryDatasetInMlButtonLabel}
        iconType="machineLearningApp"
        data-test-subj="analyzeCategoryDatasetInMlButton"
        href={viewAnomalyInMachineLearningLink}
        onClick={handleClick}
      />
    </EuiToolTip>
  );
};

const analyseCategoryDatasetInMlButtonLabel = i18n.translate(
  'xpack.infra.logs.logEntryCategories.analyzeCategoryInMlButtonLabel',
  { defaultMessage: 'Analyze in ML' }
);

const analyseCategoryDatasetInMlTooltipDescription = i18n.translate(
  'xpack.infra.logs.logEntryCategories.analyzeCategoryInMlTooltipDescription',
  { defaultMessage: 'Analyze this category in the ML app.' }
);
