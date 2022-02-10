/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { EuiHeaderLink, EuiFlyout } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FlyoutHome } from './flyout_home';
import { JobSetupScreen } from './job_setup_screen';
import { useInfraMLCapabilities } from '../../../../../../containers/ml/infra_ml_capabilities';
import { MetricHostsModuleProvider } from '../../../../../../containers/ml/modules/metrics_hosts/module';
import { MetricK8sModuleProvider } from '../../../../../../containers/ml/modules/metrics_k8s/module';
import { useSourceViaHttp } from '../../../../../../containers/metrics_source/use_source_via_http';
import { useActiveKibanaSpace } from '../../../../../../hooks/use_kibana_space';

export const AnomalyDetectionFlyout = () => {
  const { hasInfraMLSetupCapabilities } = useInfraMLCapabilities();
  const [showFlyout, setShowFlyout] = useState(false);
  const [screenName, setScreenName] = useState<'home' | 'setup'>('home');
  const [screenParams, setScreenParams] = useState<any | null>(null);
  const { source } = useSourceViaHttp({
    sourceId: 'default',
  });

  const { space } = useActiveKibanaSpace();

  const openFlyout = useCallback(() => {
    setScreenName('home');
    setShowFlyout(true);
  }, []);

  const openJobSetup = useCallback(
    (jobType: 'hosts' | 'kubernetes') => {
      setScreenName('setup');
      setScreenParams({ jobType });
    },
    [setScreenName]
  );

  const closeFlyout = useCallback(() => {
    setShowFlyout(false);
  }, []);

  if (source?.configuration.metricAlias == null || space == null) {
    return null;
  }

  return (
    <>
      <EuiHeaderLink
        color="text"
        iconSide={'left'}
        iconType={'inspect'}
        onClick={openFlyout}
        data-test-subj="openAnomalyFlyoutButton"
      >
        <FormattedMessage
          id="xpack.infra.ml.anomalyDetectionButton"
          defaultMessage="Anomaly detection"
        />
      </EuiHeaderLink>
      {showFlyout && (
        <MetricHostsModuleProvider
          indexPattern={source?.configuration.metricAlias ?? ''}
          sourceId={'default'}
          spaceId={space.id}
        >
          <MetricK8sModuleProvider
            indexPattern={source?.configuration.metricAlias ?? ''}
            sourceId={'default'}
            spaceId={space.id}
          >
            <EuiFlyout onClose={closeFlyout} data-test-subj="loadMLFlyout">
              {screenName === 'home' && (
                <FlyoutHome
                  hasSetupCapabilities={hasInfraMLSetupCapabilities}
                  goToSetup={openJobSetup}
                  closeFlyout={closeFlyout}
                />
              )}
              {screenName === 'setup' && (
                <JobSetupScreen
                  goHome={openFlyout}
                  closeFlyout={closeFlyout}
                  jobType={screenParams.jobType}
                />
              )}
            </EuiFlyout>
          </MetricK8sModuleProvider>
        </MetricHostsModuleProvider>
      )}
    </>
  );
};
