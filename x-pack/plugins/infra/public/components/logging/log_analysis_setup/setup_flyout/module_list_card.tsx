/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiCard, EuiIcon, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import { SetupStatus } from '../../../../../common/log_analysis';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { CreateJobButton, RecreateJobButton } from '../../log_analysis_setup/create_job_button';

export const LogAnalysisModuleListCard: React.FC<{
  jobId: string;
  hasSetupCapabilities: boolean;
  moduleDescription: string;
  moduleName: string;
  moduleStatus: SetupStatus;
  onViewSetup: () => void;
}> = ({
  jobId,
  hasSetupCapabilities,
  moduleDescription,
  moduleName,
  moduleStatus,
  onViewSetup,
}) => {
  const {
    services: {
      ml,
      application: { navigateToUrl },
      notifications: { toasts },
    },
  } = useKibanaContextForPlugin();

  const [viewInMlLink, setViewInMlLink] = useState<string>('');

  const getMlUrl = async () => {
    if (!ml.locator) {
      toasts.addWarning({
        title: mlNotAvailableMessage,
      });
      return;
    }
    setViewInMlLink(await ml.locator.getUrl({ page: 'jobs', pageState: { jobId } }));
  };

  useEffect(() => {
    getMlUrl();
  });

  const navigateToMlApp = async () => {
    await navigateToUrl(viewInMlLink);
  };

  const moduleIcon =
    moduleStatus.type === 'required' ? (
      <EuiIcon size="xxl" type="machineLearningApp" />
    ) : (
      <EuiIcon color="success" size="xxl" type="check" />
    );

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
        {viewInMlLink ? (
          <>
            <EuiSpacer size="xs" />
            <EuiButtonEmpty onClick={navigateToMlApp}>
              <FormattedMessage
                id="xpack.infra.logs.analysis.viewInMlButtonLabel"
                defaultMessage="View in Machine Learning"
              />
            </EuiButtonEmpty>
          </>
        ) : null}
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

const mlNotAvailableMessage = i18n.translate('xpack.infra.logs.analysis.mlNotAvailable', {
  defaultMessage: 'ML plugin is not available',
});
