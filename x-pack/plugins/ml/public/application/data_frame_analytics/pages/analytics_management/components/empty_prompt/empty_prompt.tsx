/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiImage, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import dfaImage from './data_frame_analytics_kibana.png';
import { mlNodesAvailable } from '../../../../../ml_nodes_check';
import { useMlKibana, useNavigateToPath } from '../../../../../contexts/kibana';
import { ML_PAGES } from '../../../../../../../common/constants/locator';
import { usePermissionCheck } from '../../../../../capabilities/check_capabilities';

export const AnalyticsEmptyPrompt: FC = () => {
  const {
    services: { docLinks },
  } = useMlKibana();

  const [canCreateDataFrameAnalytics, canStartStopDataFrameAnalytics] = usePermissionCheck([
    'canCreateDataFrameAnalytics',
    'canStartStopDataFrameAnalytics',
  ]);

  const disabled =
    !mlNodesAvailable() || !canCreateDataFrameAnalytics || !canStartStopDataFrameAnalytics;

  const navigateToPath = useNavigateToPath();

  const navigateToSourceSelection = async () => {
    await navigateToPath(ML_PAGES.DATA_FRAME_ANALYTICS_SOURCE_SELECTION);
  };

  return (
    <EuiEmptyPrompt
      layout="horizontal"
      hasBorder={false}
      hasShadow={false}
      icon={
        <EuiImage
          size="fullWidth"
          src={dfaImage}
          alt={i18n.translate('xpack.ml.dataFrame.analyticsList.emptyPromptTitle', {
            defaultMessage: 'Analyze your data with data frame analytics',
          })}
        />
      }
      title={
        <h2>
          <FormattedMessage
            id="xpack.ml.dataFrame.analyticsList.emptyPromptTitle"
            defaultMessage="Analyze your data with data frame analytics"
          />
        </h2>
      }
      body={
        <>
          <p>
            <FormattedMessage
              id="xpack.ml.overview.analyticsList.emptyPromptText"
              defaultMessage="Train outlier detection, regression, or classification machine learning models using data frame analytics."
            />
          </p>
        </>
      }
      actions={[
        <EuiButton
          onClick={navigateToSourceSelection}
          isDisabled={disabled}
          color="primary"
          data-test-subj="mlAnalyticsCreateFirstButton"
        >
          {i18n.translate('xpack.ml.dataFrame.analyticsList.emptyPromptButtonText', {
            defaultMessage: 'Create data frame analytics job',
          })}
        </EuiButton>,
        <EuiLink href={docLinks.links.ml.dataFrameAnalytics} target="_blank" external>
          <FormattedMessage
            id="xpack.ml.common.readDocumentationLink"
            defaultMessage="Read documentation"
          />
        </EuiLink>,
      ]}
      data-test-subj="mlNoDataFrameAnalyticsFound"
    />
  );
};
