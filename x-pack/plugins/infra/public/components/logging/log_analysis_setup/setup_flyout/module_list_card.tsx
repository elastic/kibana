/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCard, EuiIcon } from '@elastic/eui';
import React from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { RecreateJobButton } from '../../log_analysis_job_status';
import { SetupStatus } from '../../../../../common/log_analysis';

export const LogAnalysisModuleListCard: React.FC<{
  moduleDescription: string;
  moduleName: string;
  moduleStatus: SetupStatus;
  onViewSetup: () => void;
}> = ({ moduleDescription, moduleName, moduleStatus, onViewSetup }) => {
  const icon =
    moduleStatus.type === 'required' ? (
      <EuiIcon size="xxl" type="machineLearningApp" />
    ) : (
      <EuiIcon color="secondary" size="xxl" type="check" />
    );
  const footerContent =
    moduleStatus.type === 'required' ? (
      <EuiButton onClick={onViewSetup}>
        <FormattedMessage
          id="xpack.infra.logs.analysis.enableAnomalyDetectionButtonLabel"
          defaultMessage="Enable anomaly detection"
        />
      </EuiButton>
    ) : (
      <RecreateJobButton onClick={onViewSetup} />
    );

  return (
    <EuiCard
      description={moduleDescription}
      footer={<div>{footerContent}</div>}
      icon={icon}
      title={moduleName}
    />
  );
};
