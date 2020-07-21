/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiCard, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { SetupStatus } from '../../../../../common/log_analysis';
import { RecreateJobButton } from '../../log_analysis_job_status';
import { MissingSetupPrivilegesToolTip } from '../missing_setup_privileges_tooltip';

export const LogAnalysisModuleListCard: React.FC<{
  hasSetupCapabilities: boolean;
  moduleDescription: string;
  moduleName: string;
  moduleStatus: SetupStatus;
  onViewSetup: () => void;
}> = ({ hasSetupCapabilities, moduleDescription, moduleName, moduleStatus, onViewSetup }) => {
  const moduleIcon =
    moduleStatus.type === 'required' ? (
      <EuiIcon size="xxl" type="machineLearningApp" />
    ) : (
      <EuiIcon color="secondary" size="xxl" type="check" />
    );

  const moduleSetupButton = (
    <ModuleSetupButton
      hasSetupCapabilities={hasSetupCapabilities}
      onViewSetup={onViewSetup}
      setupType={moduleStatus.type === 'required' ? 'create' : 'recreate'}
    />
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

const ModuleSetupButton: React.FC<{
  hasSetupCapabilities: boolean;
  onViewSetup: () => void;
  setupType: 'create' | 'recreate';
}> = ({ hasSetupCapabilities, onViewSetup, setupType }) => {
  const moduleSetupButton =
    setupType === 'create' ? (
      <EuiButton disabled={!hasSetupCapabilities} onClick={onViewSetup}>
        <FormattedMessage
          id="xpack.infra.logs.analysis.enableAnomalyDetectionButtonLabel"
          defaultMessage="Enable anomaly detection"
        />
      </EuiButton>
    ) : (
      <RecreateJobButton disabled={!hasSetupCapabilities} onClick={onViewSetup} />
    );

  return hasSetupCapabilities ? (
    moduleSetupButton
  ) : (
    <MissingSetupPrivilegesToolTip position="bottom" delay="regular">
      {moduleSetupButton}
    </MissingSetupPrivilegesToolTip>
  );
};
