/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
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
} from '@elastic/eui';
import { useGetOneAgentPolicyFull, useGetOneAgentPolicy, useCore } from '../../../hooks';
import { Loading } from '../../../components';
import { fullAgentPolicyToYaml, agentPolicyRouteService } from '../../../services';

const FlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflowContent {
    padding: 0;
  }
`;

export const AgentPolicyYamlFlyout = memo<{ policyId: string; onClose: () => void }>(
  ({ policyId, onClose }) => {
    const core = useCore();
    const { isLoading: isLoadingYaml, data: yamlData } = useGetOneAgentPolicyFull(policyId);
    const { data: agentPolicyData } = useGetOneAgentPolicy(policyId);

    const body =
      isLoadingYaml && !yamlData ? (
        <Loading />
      ) : (
        <EuiCodeBlock language="yaml" isCopyable fontSize="m">
          {fullAgentPolicyToYaml(yamlData!.item)}
        </EuiCodeBlock>
      );

    const downloadLink = core.http.basePath.prepend(
      agentPolicyRouteService.getInfoFullDownloadPath(policyId)
    );

    return (
      <EuiFlyout onClose={onClose} size="l" maxWidth={640}>
        <EuiFlyoutHeader hasBorder aria-labelledby="IngestManagerAgentPolicyYamlFlyoutTitle">
          <EuiTitle size="m">
            <h2 id="IngestManagerAgentPolicyYamlFlyoutTitle">
              {agentPolicyData?.item ? (
                <FormattedMessage
                  id="xpack.ingestManager.policyDetails.yamlflyoutTitleWithName"
                  defaultMessage="'{name}' agent policy"
                  values={{ name: agentPolicyData.item.name }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.ingestManager.policyDetails.yamlflyoutTitleWithoutName"
                  defaultMessage="Agent policy"
                />
              )}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <FlyoutBody>{body}</FlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose} flush="left">
                <FormattedMessage
                  id="xpack.ingestManager.policyDetails.yamlFlyoutCloseButtonLabel"
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
                  id="xpack.ingestManager.policyDetails.yamlDownloadButtonLabel"
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
