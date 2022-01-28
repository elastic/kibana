/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiTitle,
} from '@elastic/eui';
import adImage from './anomaly_detection_kibana.png';
import { ML_PAGES } from '../../../../../../common/constants/locator';
import { useMlKibana, useMlLocator, useNavigateToPath } from '../../../../contexts/kibana';
import { checkPermission } from '../../../../capabilities/check_capabilities';
import { mlNodesAvailable } from '../../../../ml_nodes_check';

export const AnomalyDetectionEmptyState: FC = () => {
  const disableCreateAnomalyDetectionJob = !checkPermission('canCreateJob') || !mlNodesAvailable();

  const {
    services: { docLinks },
  } = useMlKibana();

  const mlLocator = useMlLocator();
  const navigateToPath = useNavigateToPath();

  const redirectToCreateJobSelectIndexPage = async () => {
    if (!mlLocator) return;
    const path = await mlLocator.getUrl({
      page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX,
    });
    await navigateToPath(path, true);
  };

  return (
    <EuiEmptyPrompt
      layout="horizontal"
      hasBorder={false}
      hasShadow={false}
      icon={<EuiImage size="fullWidth" src={adImage} alt="anomaly_detection" />}
      color="subdued"
      title={
        <h2>
          <FormattedMessage
            id="xpack.ml.overview.anomalyDetection.createFirstJobMessage"
            defaultMessage="Create your first anomaly detection job"
          />
        </h2>
      }
      body={
        <>
          <p>
            <FormattedMessage
              id="xpack.ml.overview.anomalyDetection.emptyPromptText"
              defaultMessage="Anomaly detection enables you to find unusual behavior in time series data. Start automatically spotting the anomalies hiding in your data and resolve issues faster."
            />
          </p>
        </>
      }
      actions={
        <EuiButton
          color="primary"
          onClick={redirectToCreateJobSelectIndexPage}
          fill
          iconType="plusInCircle"
          isDisabled={disableCreateAnomalyDetectionJob}
          data-test-subj="mlCreateNewJobButton"
        >
          <FormattedMessage
            id="xpack.ml.overview.anomalyDetection.createJobButtonText"
            defaultMessage="Create job"
          />
        </EuiButton>
      }
      footer={
        <EuiFlexGroup gutterSize={'xs'} alignItems={'center'}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h3>
                <FormattedMessage
                  id="xpack.ml.common.learnMoreQuestion"
                  defaultMessage="Want to learn more?"
                />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink href={docLinks.links.ml.anomalyDetection} target="_blank" external>
              <FormattedMessage
                id="xpack.ml.common.readDocumentationLink"
                defaultMessage="Read documentation"
              />
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      data-test-subj="mlAnomalyDetectionEmptyState"
    />
  );
};
