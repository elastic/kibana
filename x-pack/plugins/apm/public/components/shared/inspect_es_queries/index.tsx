/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useState } from 'react';
import { enableInspectEsQueries } from '../../../../../observability/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { InspectResponse } from '../../../../server';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

interface Props {
  inspect?: InspectResponse;
}

function createESQuery(inspect: InspectResponse[0], idx: number) {
  const { index, body } = inspect.requestParams;
  return [
    `#query_${idx + 1}`,
    `GET ${index}/_search`,
    JSON.stringify(body, null, 2),
  ];
}

export function InspectESQueries({ inspect }: Props) {
  const [copied, setCopied] = useState(false);

  const { uiSettings } = useApmPluginContext().core;
  if (!uiSettings.get(enableInspectEsQueries) || !inspect) {
    return null;
  }

  return (
    <EuiToolTip
      content={
        copied
          ? 'Copied!'
          : 'Copy ES queries to clipboard for further inspection'
      }
      onMouseOut={() => {
        setCopied(false);
      }}
    >
      <EuiButtonIcon
        iconType="inspect"
        onClick={() => {
          const queries = inspect.flatMap(createESQuery);
          navigator.clipboard.writeText(queries.join('\n'));
          setCopied(true);
        }}
      />
    </EuiToolTip>
  );
}
