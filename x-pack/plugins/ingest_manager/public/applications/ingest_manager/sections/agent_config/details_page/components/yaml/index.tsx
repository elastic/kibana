/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { dump } from 'js-yaml';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { AgentConfig } from '../../../../../types';
import {
  useGetOneAgentConfigFull,
  useGetEnrollmentAPIKeys,
  useGetOneEnrollmentAPIKey,
  useCore,
} from '../../../../../hooks';
import { ShellEnrollmentInstructions } from '../../../../../components/enrollment_instructions';
import { Loading } from '../../../../../components';

const CONFIG_KEYS_ORDER = [
  'id',
  'name',
  'revision',
  'type',
  'outputs',
  'datasources',
  'enabled',
  'package',
  'input',
];

export const ConfigYamlView = memo<{ config: AgentConfig }>(({ config }) => {
  const core = useCore();

  const fullConfigRequest = useGetOneAgentConfigFull(config.id);
  const apiKeysRequest = useGetEnrollmentAPIKeys({
    page: 1,
    perPage: 1000,
  });
  const apiKeyRequest = useGetOneEnrollmentAPIKey(apiKeysRequest.data?.list?.[0]?.id);

  if (fullConfigRequest.isLoading && !fullConfigRequest.data) {
    return <Loading />;
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={7}>
        <EuiCodeBlock language="yaml" isCopyable overflowHeight={500}>
          {dump(fullConfigRequest.data.item, {
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
      </EuiFlexItem>
      {apiKeyRequest.data && (
        <EuiFlexItem grow={3}>
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.ingestManager.yamlConfig.instructionTittle"
                defaultMessage="Enroll with fleet"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiText size="s">
            <FormattedMessage
              id="xpack.ingestManager.yamlConfig.instructionDescription"
              defaultMessage="To enroll an agent with this configuration, copy and run the following command on your host."
            />
          </EuiText>
          <EuiSpacer size="m" />
          <ShellEnrollmentInstructions
            apiKey={apiKeyRequest.data.item}
            kibanaUrl={`${window.location.origin}${core.http.basePath.get()}`}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});
