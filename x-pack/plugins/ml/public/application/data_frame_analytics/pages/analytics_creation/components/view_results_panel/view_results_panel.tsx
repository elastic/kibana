/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { EuiCard, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMlUrlGenerator } from '../../../../../contexts/kibana';
import { ML_PAGES } from '../../../../../../../common/constants/ml_url_generator';
import { useNavigateToPath } from '../../../../../contexts/kibana';
import { DataFrameAnalysisConfigType } from '../../../../../../../common/types/data_frame_analytics';
interface Props {
  jobId: string;
  analysisType: DataFrameAnalysisConfigType;
}

export const ViewResultsPanel: FC<Props> = ({ jobId, analysisType }) => {
  const urlGenerator = useMlUrlGenerator();
  const navigateToPath = useNavigateToPath();

  const redirectToAnalyticsExplorationPage = async () => {
    const path = await urlGenerator.createUrl({
      page: ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
      pageState: {
        jobId,
        analysisType,
      },
    });
    await navigateToPath(path);
  };

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
        onClick={redirectToAnalyticsExplorationPage}
        data-test-subj="analyticsWizardViewResultsCard"
      />
    </Fragment>
  );
};
