/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { TimeRange } from '../../../../../../common/http_api/shared';
import { getEntitySpecificSingleMetricViewerLink } from '../../../../../components/logging/log_analysis_results';
import { useLinkProps } from '../../../../../hooks/use_link_props';

export const AnalyzeCategoryDatasetInMlAction: React.FunctionComponent<{
  categorizationJobId: string;
  categoryId: number;
  dataset: string;
  timeRange: TimeRange;
}> = ({ categorizationJobId, categoryId, dataset, timeRange }) => {
  const linkProps = useLinkProps(
    getEntitySpecificSingleMetricViewerLink(categorizationJobId, timeRange, {
      'event.dataset': dataset,
      mlcategory: `${categoryId}`,
    })
  );

  return (
    <EuiToolTip content={analyseCategoryDatasetInMlTooltipDescription} delay="long">
      <EuiButtonIcon
        aria-label={analyseCategoryDatasetInMlButtonLabel}
        iconType="machineLearningApp"
        data-test-subj="analyzeCategoryDatasetInMlButton"
        {...linkProps}
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
