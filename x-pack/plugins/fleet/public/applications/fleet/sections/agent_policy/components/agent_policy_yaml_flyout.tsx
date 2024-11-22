/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import { dump } from 'js-yaml';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';

import { MAX_FLYOUT_WIDTH } from '../../../constants';
import { useGetOneAgentPolicyFull, useGetOneAgentPolicy, useStartServices } from '../../../hooks';
import { Loading } from '../../../components';
import { fullAgentPolicyToYaml, agentPolicyRouteService } from '../../../services';
import { API_VERSIONS } from '../../../../../../common/constants';

const FlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflowContent {
    padding: 0;
  }
`;

export const AgentPolicyYamlFlyout = memo<{ policyId: string; onClose: () => void }>(
  ({ policyId, onClose }) => {
    const core = useStartServices();
    const { isLoading: isLoadingYaml, data: yamlData, error } = useGetOneAgentPolicyFull(policyId);
    const { data: agentPolicyData } = useGetOneAgentPolicy(policyId);
    const packagePoliciesContainSecrets = agentPolicyData?.item?.package_policies?.some(
      (packagePolicy) => packagePolicy?.secret_references?.length
    );
    const body = isLoadingYaml ? (
      <Loading />
    ) : error ? (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.fleet.policyDetails.ErrorGettingFullAgentPolicy"
            defaultMessage="Error loading agent policy"
          />
        }
        color="danger"
        iconType="warning"
      >
        {error.message}
      </EuiCallOut>
    ) : (
      <>
        <EuiCodeBlock language="yaml" isCopyable fontSize="m" whiteSpace="pre">
          {fullAgentPolicyToYaml(yamlData!.item, dump)}
        </EuiCodeBlock>
      </>
    );

    const downloadLink =
      core.http.basePath.prepend(agentPolicyRouteService.getInfoFullDownloadPath(policyId)) +
      `?apiVersion=${API_VERSIONS.public.v1}`;

    return (
      <EuiFlyout onClose={onClose} maxWidth={MAX_FLYOUT_WIDTH}>
        <EuiFlyoutHeader hasBorder aria-labelledby="IngestManagerAgentPolicyYamlFlyoutTitle">
          <EuiTitle size="m">
            <h2 id="IngestManagerAgentPolicyYamlFlyoutTitle">
              {agentPolicyData?.item ? (
                <FormattedMessage
                  id="xpack.fleet.policyDetails.yamlflyoutTitleWithName"
                  defaultMessage="''{name}'' agent policy"
                  values={{ name: agentPolicyData.item.name }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.fleet.policyDetails.yamlflyoutTitleWithoutName"
                  defaultMessage="Agent policy"
                />
              )}
            </h2>
          </EuiTitle>
          {packagePoliciesContainSecrets && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.fleet.policyDetails.secretsTitle"
                    defaultMessage="This policy contains secret values"
                  />
                }
                size="m"
                color="primary"
                iconType="iInCircle"
              >
                <FormattedMessage
                  id="xpack.fleet.policyDetails.secretsDescription"
                  defaultMessage="Kibana does not have access to secret values. You will need to set these values manually after deploying the agent policy. Look out for environment variables in the format {envVarPrefix} in the agent configuration."
                  values={{
                    envVarPrefix: <code>{'${SECRET_0}'}</code>,
                  }}
                />
              </EuiCallOut>
            </>
          )}
        </EuiFlyoutHeader>
        <FlyoutBody>{body}</FlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose} flush="left">
                <FormattedMessage
                  id="xpack.fleet.policyDetails.yamlFlyoutCloseButtonLabel"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                href={downloadLink}
                iconType="download"
                isDisabled={Boolean(isLoadingYaml && !yamlData)}
              >
                <FormattedMessage
                  id="xpack.fleet.policyDetails.yamlDownloadButtonLabel"
                  defaultMessage="Download policy"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);
