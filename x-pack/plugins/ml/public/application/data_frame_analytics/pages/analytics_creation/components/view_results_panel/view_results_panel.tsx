/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { EuiCard, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useNavigateToPath } from '../../../../../contexts/kibana';
import { getResultsUrl } from '../../../analytics_management/components/analytics_list/common';
import { ANALYSIS_CONFIG_TYPE } from '../../../../common/analytics';

interface Props {
  jobId: string;
  analysisType: ANALYSIS_CONFIG_TYPE;
}

export const ViewResultsPanel: FC<Props> = ({ jobId, analysisType }) => {
  const navigateToPath = useNavigateToPath();

  const redirectToAnalyticsManagementPage = async () => {
    const path = getResultsUrl(jobId, analysisType);
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
        onClick={redirectToAnalyticsManagementPage}
        data-test-subj="analyticsWizardViewResultsCard"
      />
    </Fragment>
  );
};
