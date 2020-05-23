/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { dump } from 'js-yaml';
import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AgentConfig } from '../../../../../types';
import { useGetOneAgentConfigFull } from '../../../../../hooks';
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
  const fullConfigRequest = useGetOneAgentConfigFull(config.id);

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
    </EuiFlexGroup>
  );
});
