/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { DASHBOARD_APP_ID, createDashboardEditUrl } from '@kbn/dashboard-plugin/public';

import { useIntraAppState, useStartServices } from '../../../../../hooks';

import {
  ConfirmIncomingDataWithPreview,
  ConfirmIncomingDataStandalone,
} from '../../multi_page_layout/components';
import type { EmbeddedIntegrationStepsLayoutProps } from '../types';
import { FLEET_KUBERNETES_PACKAGE } from '../../../../../../../../common';
import type { AgentPolicyDetailsDeployAgentAction } from '../../../../../types';

export const FinalBottomBar: React.FC<{
  pkgkey: string;
  handleAddAnotherIntegration: () => void;
  handleViewAssets: () => void;
  viewKubernetesMetricsDashboards: () => void;
}> = ({
  pkgkey,
  handleAddAnotherIntegration,
  handleViewAssets,
  viewKubernetesMetricsDashboards,
}) => {
  const isK8s = pkgkey.includes(FLEET_KUBERNETES_PACKAGE);
  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty color="text" size="s" onClick={handleAddAnotherIntegration}>
            <FormattedMessage
              id="xpack.fleet.createPackagePolicyBottomBar.addAnotherIntegration"
              defaultMessage="Add another integration"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexItem>
      {!isK8s && (
        <EuiFlexItem grow={false}>
          <EuiButton color="success" fill size="m" onClick={handleViewAssets}>
            <FormattedMessage
              id="xpack.fleet.confirmIncomingData.viewDataAssetsButtonText'"
              defaultMessage="View assets"
            />
          </EuiButton>
        </EuiFlexItem>
      )}
      {isK8s && (
        <EuiFlexItem grow={false}>
          <EuiButton
            color="success"
            fill
            size="m"
            // href={getAbsolutePath(
            //   '/app/dashboards#/view/kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c'
            // )}
            onClick={viewKubernetesMetricsDashboards}
          >
            <FormattedMessage
              id="xpack.fleet.confirmIncomingData. '"
              defaultMessage="View Kubernetes metrics dashboards"
            />
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const ConfirmDataStepFromOnboardingHub: React.FC<EmbeddedIntegrationStepsLayoutProps> = (
  props
) => {
  const { enrolledAgentIds, packageInfo, isManaged, onCancel, handleViewAssets } = props;
  const core = useStartServices();

  const [agentDataConfirmed, setAgentDataConfirmed] = useState(false);
  const {
    docLinks: {
      links: {
        fleet: { troubleshooting: troubleshootLink },
      },
    },
    application: { navigateToApp },
  } = core;
  const routeState = useIntraAppState<AgentPolicyDetailsDeployAgentAction>();

  const handleAddAnotherIntegration = () => {
    // Close the modal
    onCancel();
  };

  const viewKubernetesMetricsDashboards = useCallback(() => {
    // Open the Kubernetes metrics dashboards in security solution
    // href={getAbsolutePath(
    //   '/app/dashboards#/view/kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c'
    // )}
    if (routeState && routeState.onDoneNavigateTo) {
      const [appId] = routeState.onDoneNavigateTo;
      return () => {
        navigateToApp(appId === 'securitySolutionUI' ? appId : DASHBOARD_APP_ID, {
          path: createDashboardEditUrl(`kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c`),
        });
      };
    }
  }, [navigateToApp, routeState]);

  if (!isManaged) {
    return (
      <ConfirmIncomingDataStandalone troubleshootLink={troubleshootLink}>
        <FinalBottomBar
          pkgkey={`${packageInfo.name}-${packageInfo.version}`}
          handleAddAnotherIntegration={handleAddAnotherIntegration}
          handleViewAssets={handleViewAssets}
          viewKubernetesMetricsDashboards={viewKubernetesMetricsDashboards}
        />
      </ConfirmIncomingDataStandalone>
    );
  }

  return (
    <ConfirmIncomingDataWithPreview
      agentIds={enrolledAgentIds}
      packageInfo={packageInfo}
      agentDataConfirmed={agentDataConfirmed}
      setAgentDataConfirmed={setAgentDataConfirmed}
      troubleshootLink={troubleshootLink}
    >
      {!!agentDataConfirmed && (
        <FinalBottomBar
          pkgkey={`${packageInfo.name}-${packageInfo.version}`}
          handleAddAnotherIntegration={handleAddAnotherIntegration}
          handleViewAssets={handleViewAssets}
          viewKubernetesMetricsDashboards={viewKubernetesMetricsDashboards}
        />
      )}
    </ConfirmIncomingDataWithPreview>
  );
};
