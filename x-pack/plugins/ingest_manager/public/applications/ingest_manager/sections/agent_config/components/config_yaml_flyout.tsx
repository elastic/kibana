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
import { useGetOneAgentConfigFull, useGetOneAgentConfig, useCore } from '../../../hooks';
import { Loading } from '../../../components';
import { configToYaml, agentConfigRouteService } from '../../../services';

const FlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflowContent {
    padding: 0;
  }
`;

export const ConfigYamlFlyout = memo<{ configId: string; onClose: () => void }>(
  ({ configId, onClose }) => {
    const core = useCore();
    const { isLoading: isLoadingYaml, data: yamlData } = useGetOneAgentConfigFull(configId);
    const { data: configData } = useGetOneAgentConfig(configId);

    const body =
      isLoadingYaml && !yamlData ? (
        <Loading />
      ) : (
        <EuiCodeBlock language="yaml" isCopyable fontSize="m">
          {configToYaml(yamlData!.item)}
        </EuiCodeBlock>
      );

    const downloadLink = core.http.basePath.prepend(
      agentConfigRouteService.getInfoFullDownloadPath(configId)
    );

    return (
      <EuiFlyout onClose={onClose} size="l" maxWidth={640}>
        <EuiFlyoutHeader hasBorder aria-labelledby="IngestManagerConfigYamlFlyoutTitle">
          <EuiTitle size="m">
            <h2 id="IngestManagerConfigYamlFlyoutTitle">
              {configData?.item ? (
                <FormattedMessage
                  id="xpack.ingestManager.configDetails.yamlflyoutTitleWithName"
                  defaultMessage="'{name}' agent configuration"
                  values={{ name: configData.item.name }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.ingestManager.configDetails.yamlflyoutTitleWithoutName"
                  defaultMessage="Agent configuration"
                />
              )}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <FlyoutBody>{body}</FlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
                <FormattedMessage
                  id="xpack.ingestManager.configDetails.yamlFlyoutCloseButtonLabel"
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
                  id="xpack.ingestManager.configDetails.yamlDownloadButtonLabel"
                  defaultMessage="Download configuration"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);
