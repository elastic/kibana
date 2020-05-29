/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { dump } from 'js-yaml';
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
import { useGetOneAgentConfigFull, useGetOneAgentConfig } from '../../../hooks';
import { Loading } from '../../../components';

const FlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflowContent {
    padding: 0;
  }
`;

const CONFIG_KEYS_ORDER = [
  'id',
  'name',
  'revision',
  'type',
  'outputs',
  'settings',
  'datasources',
  'enabled',
  'package',
  'input',
];

export const ConfigYamlFlyout = memo<{ configId: string; onClose: () => void }>(
  ({ configId, onClose }) => {
    const { isLoading: isLoadingYaml, data: yamlData } = useGetOneAgentConfigFull(configId);
    const { data: configData } = useGetOneAgentConfig(configId);

    const body =
      isLoadingYaml && !yamlData ? (
        <Loading />
      ) : (
        <EuiCodeBlock language="yaml" isCopyable fontSize="m">
          {dump(yamlData.item, {
            sortKeys: (keyA: string, keyB: string) => {
              const indexA = CONFIG_KEYS_ORDER.indexOf(keyA);
              const indexB = CONFIG_KEYS_ORDER.indexOf(keyB);
              if (indexA >= 0 && indexB < 0) {
                return -1;
              }

              if (indexA < 0 && indexB >= 0) {
                return 1;
              }

              return indexA - indexB;
            },
          })}
        </EuiCodeBlock>
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
              <EuiButton onClick={() => {}} iconType="download">
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
