/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonRectangle, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../../../../common/i18n';
import { AgentName } from '../../../../../../typings/es_schemas/ui/fields/agent';

export function AgentLatestVersion({
  agentName,
  isLoading,
  latestVersion,
  failed,
}: {
  agentName: AgentName;
  isLoading: boolean;
  latestVersion?: string;
  failed: boolean;
}) {
  const { euiTheme } = useEuiTheme();

  const latestVersionElement = latestVersion ? <>{latestVersion}</> : <>{NOT_AVAILABLE_LABEL}</>;

  const failedLatestVersionsElement = (
    <EuiToolTip
      content={i18n.translate('xpack.apm.agentExplorer.agentLatestVersion.airGappedMessage', {
        defaultMessage:
          'The latest version of {agentName} agent could not be fetched from the repository. Please contact your administrator to check the server logs.',
        values: { agentName },
      })}
    >
      <>{NOT_AVAILABLE_LABEL}</>
    </EuiToolTip>
  );

  return (
    <EuiSkeletonRectangle
      width="60px"
      height={euiTheme.size.l}
      borderRadius="m"
      isLoading={isLoading}
    >
      {!failed ? latestVersionElement : failedLatestVersionsElement}
    </EuiSkeletonRectangle>
  );
}
