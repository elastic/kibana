/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback } from 'react';
import { EuiPageTemplate, EuiButton, EuiImage } from '@elastic/eui';
import { css } from '@emotion/react';
import { useEuiBackgroundColor } from '@elastic/eui';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { MetricsPageTemplate } from '../page_template';
import hostsLandingBeta from './hosts_landing_beta.svg';
import { HostsPage } from '../hosts';

interface Props {
  uiSettings: IUiSettingsClient | undefined;
}

export const HostsLandingPage = ({ uiSettings }: Props) => {
  const [isHostViewEnabled, setIsHostViewEnabled] = React.useState<boolean | null>(null);
  const backgroundColor = useEuiBackgroundColor('subdued');

  const getIsHostViewEnabled = useCallback(async () => {
    const getHostViewSettings = await uiSettings?.get(
      'observability:enableInfrastructureHostsView'
    );
    setIsHostViewEnabled(getHostViewSettings);
  }, [uiSettings]);

  useEffect(() => {
    try {
      getIsHostViewEnabled();
    } catch (error) {
      // TODO
      // console.error(error);
    }
  }, [getIsHostViewEnabled, isHostViewEnabled]);

  if (isHostViewEnabled === null) {
    return <SourceLoadingPage />;
  }

  if (isHostViewEnabled) {
    return <HostsPage />;
  }

  return (
    <MetricsPageTemplate isEmptyState>
      <EuiPageTemplate.EmptyPrompt
        title={<h2>Introducing: Host Analysis</h2>}
        alignment="center"
        icon={<EuiImage size="fullWidth" src={hostsLandingBeta} alt="" />}
        color="plain"
        layout="horizontal"
        body={
          <>
            <p>
              Introducing our new &apos;Hosts&apos; feature, now available in technical preview!
              With this powerful tool, you can easily view and analyse your hosts and identify any
              issues so you address them quickly. Get a detailed view of metrics for your hosts, see
              which ones are triggering the most alerts and filter the hosts you want to analyse
              using any KQL filter and easy breakdowns such as cloud provider and operating system.
            </p>
            <p>
              This is an early version of the feature and we would love your feedback as we continue
              to develop and improve it. To access the feature, simply enable below. Don&apos;t miss
              out on this powerful new addition to our platform - try it out today!
            </p>
          </>
        }
        css={css`
          background-color: ${backgroundColor};
        `}
        actions={
          <EuiButton
            color="primary"
            data-test-subj="hostsView-enable-feature-button"
            onClick={() => {
              uiSettings?.set('observability:enableInfrastructureHostsView', true);
              setIsHostViewEnabled(true);
            }}
          >
            Enable hosts view
          </EuiButton>
        }
      />
    </MetricsPageTemplate>
  );
};
