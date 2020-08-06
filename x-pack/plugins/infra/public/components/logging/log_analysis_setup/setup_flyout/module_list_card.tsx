/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCard, EuiIcon, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { SetupStatus } from '../../../../../common/log_analysis';
import { CreateJobButton, RecreateJobButton } from '../../log_analysis_setup/create_job_button';
import { useLinkProps } from '../../../../hooks/use_link_props';
import { getOverallAnomalyExplorerLinkDescriptor } from '../../log_analysis_results/analyze_in_ml_button';

export const LogAnalysisModuleListCard: React.FC<{
  jobId: string;
  timeRange: { startTime: string; endTime: string };
  hasSetupCapabilities: boolean;
  moduleDescription: string;
  moduleName: string;
  moduleStatus: SetupStatus;
  onViewSetup: () => void;
}> = ({
  jobId,
  timeRange,
  hasSetupCapabilities,
  moduleDescription,
  moduleName,
  moduleStatus,
  onViewSetup,
}) => {
  const moduleIcon =
    moduleStatus.type === 'required' ? (
      <EuiIcon size="xxl" type="machineLearningApp" />
    ) : (
      <EuiIcon color="secondary" size="xxl" type="check" />
    );

  const viewInMlLinkProps = useLinkProps(getOverallAnomalyExplorerLinkDescriptor(jobId, timeRange));

  const moduleSetupButton =
    moduleStatus.type === 'required' ? (
      <CreateJobButton hasSetupCapabilities={hasSetupCapabilities} onClick={onViewSetup}>
        <FormattedMessage
          id="xpack.infra.logs.analysis.enableAnomalyDetectionButtonLabel"
          defaultMessage="Enable anomaly detection"
        />
      </CreateJobButton>
    ) : (
      <>
        <RecreateJobButton hasSetupCapabilities={hasSetupCapabilities} onClick={onViewSetup} />
        <EuiButtonEmpty {...viewInMlLinkProps}>
          <FormattedMessage
            id="xpack.infra.logs.analysy.viewInMlButtonLabel"
            defaultMessage="View in Machine Learning"
          />
        </EuiButtonEmpty>
      </>
    );

  return (
    <EuiCard
      description={moduleDescription}
      footer={<div>{moduleSetupButton}</div>}
      icon={moduleIcon}
      title={moduleName}
    />
  );
};
