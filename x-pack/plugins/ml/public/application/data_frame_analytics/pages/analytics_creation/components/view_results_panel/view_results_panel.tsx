/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment } from 'react';
import { EuiCard, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataFrameAnalysisConfigType } from '@kbn/ml-data-frame-analytics-utils';
import { useMlLink } from '../../../../../contexts/kibana';
import { ML_PAGES } from '../../../../../../../common/constants/locator';
interface Props {
  jobId: string;
  analysisType: DataFrameAnalysisConfigType;
}

export const ViewResultsPanel: FC<Props> = ({ jobId, analysisType }) => {
  const analyticsExplorationPageLink = useMlLink({
    page: ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
    pageState: {
      jobId,
      analysisType,
    },
  });

  return (
    <Fragment>
      <EuiCard
        className="dfAnalyticsCreationWizard__card"
        icon={<EuiIcon size="xxl" type="visTable" />}
        title={i18n.translate('xpack.ml.dataframe.analytics.create.viewResultsCardTitle', {
          defaultMessage: 'View Results',
        })}
        description={i18n.translate(
          'xpack.ml.dataframe.analytics.create.viewResultsCardDescription',
          {
            defaultMessage: 'View results for the analytics job.',
          }
        )}
        href={analyticsExplorationPageLink}
        data-test-subj="analyticsWizardViewResultsCard"
      />
    </Fragment>
  );
};
