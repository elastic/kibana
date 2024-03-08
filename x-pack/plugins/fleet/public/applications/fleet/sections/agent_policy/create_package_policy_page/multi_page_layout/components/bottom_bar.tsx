/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiBottomBar, EuiFlexGroup, EuiFlexItem, EuiButton, EuiButtonEmpty } from '@elastic/eui';

import { useLink } from '../../../../../../../hooks';
import { useGetDiscoverLogsLinkForAgents } from '../hooks';
import { FLEET_KUBERNETES_PACKAGE } from '../../../../../../../../common';

const CenteredRoundedBottomBar = styled(EuiBottomBar)`
  max-width: 820px;
  margin: 0 auto;
  border-radius: 8px 8px 0px 0px;
`;
const NoAnimationCenteredRoundedBottomBar = styled(CenteredRoundedBottomBar)`
  animation-delay: -99s; #stop bottom bar flying in on step change
`;

export const NotObscuredByBottomBar = styled('div')`
  padding-bottom: 100px;
`;

export const CreatePackagePolicyBottomBar: React.FC<{
  isLoading?: boolean;
  isDisabled?: boolean;
  cancelClickHandler?: React.ReactEventHandler;
  cancelUrl?: string;
  cancelMessage?: React.ReactElement;
  actionMessage: React.ReactElement;
  onNext: () => void;
  noAnimation?: boolean;
  loadingMessage?: React.ReactElement;
}> = ({
  isLoading,
  loadingMessage,
  onNext,
  cancelClickHandler,
  cancelUrl,
  actionMessage,
  cancelMessage,
  isDisabled = false,
  noAnimation = false,
}) => {
  const Bar = noAnimation ? NoAnimationCenteredRoundedBottomBar : CenteredRoundedBottomBar;
  return (
    <Bar position="sticky">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexItem grow={false}>
            {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
            <EuiButtonEmpty color="text" size="s" href={cancelUrl} onClick={cancelClickHandler}>
              {cancelMessage || (
                <FormattedMessage
                  id="xpack.fleet.createPackagePolicyBottomBar.backButton"
                  defaultMessage="Go back"
                />
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="primary"
            fill
            size="m"
            isDisabled={isDisabled}
            isLoading={!isDisabled && isLoading}
            onClick={onNext}
          >
            {isLoading
              ? loadingMessage || (
                  <FormattedMessage
                    id="xpack.fleet.createPackagePolicyBottomBar.loading"
                    defaultMessage="Loading..."
                  />
                )
              : actionMessage}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Bar>
  );
};

export const AgentStandaloneBottomBar: React.FC<{
  cancelClickHandler?: React.ReactEventHandler;
  cancelUrl?: string;
  onNext: () => void;
  noAnimation?: boolean;
}> = ({ onNext, cancelClickHandler, cancelUrl, noAnimation = false }) => {
  const Bar = noAnimation ? NoAnimationCenteredRoundedBottomBar : CenteredRoundedBottomBar;
  return (
    <Bar>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexItem grow={false}>
            {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
            <EuiButtonEmpty color="text" size="s" href={cancelUrl} onClick={cancelClickHandler}>
              <FormattedMessage
                id="xpack.fleet.agentStandaloneBottomBar.backButton"
                defaultMessage="Go back"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton color="primary" fill size="m" onClick={onNext}>
            <FormattedMessage
              id="xpack.fleet.agentStandaloneBottomBar.viewIncomingDataBtn"
              defaultMessage="View incoming data"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Bar>
  );
};

export const CreatePackagePolicyFinalBottomBar: React.FC<{
  pkgkey: string;
}> = ({ pkgkey }) => {
  const isK8s = pkgkey.includes(FLEET_KUBERNETES_PACKAGE);
  const { getHref } = useLink();
  const { getAbsolutePath } = useLink();
  return (
    <CenteredRoundedBottomBar>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty color="text" size="s" href={getHref('integrations_all')}>
              <FormattedMessage
                id="xpack.fleet.createPackagePolicyBottomBar.addAnotherIntegration"
                defaultMessage="Add another integration"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexItem>
        {!isK8s && (
          <EuiFlexItem grow={false}>
            <EuiButton
              color="success"
              fill
              size="m"
              href={getHref('integration_details_assets', {
                pkgkey,
              })}
            >
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
              href={getAbsolutePath(
                '/app/dashboards#/view/kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c'
              )}
            >
              <FormattedMessage
                id="xpack.fleet.confirmIncomingData. '"
                defaultMessage="View Kubernetes metrics dashboards"
              />
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </CenteredRoundedBottomBar>
  );
};

export const AgentDataTimedOutBottomBar: React.FC<{
  troubleshootLink: string;
  agentIds: string[];
  integration?: string;
}> = ({ troubleshootLink, agentIds, integration }) => {
  const discoverLogsLink = useGetDiscoverLogsLinkForAgents(agentIds);

  return (
    <CenteredRoundedBottomBar>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            color="text"
            size="s"
            href={troubleshootLink}
            iconType="popout"
            target="_blank"
          >
            <FormattedMessage
              id="xpack.fleet.confirmIncomingData.timeout.troubleshootLinkBottomBar"
              defaultMessage="Troubleshooting guide"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton color="success" fill href={discoverLogsLink ?? ''}>
            <FormattedMessage
              id="xpack.fleet.confirmIncomingData.timeout.discoverLogsLink"
              defaultMessage="View incoming {integration} logs"
              values={{
                integration: integration ?? '',
              }}
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </CenteredRoundedBottomBar>
  );
};
