/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../../../../common/i18n';
import { AgentName } from '../../../../../../typings/es_schemas/ui/fields/agent';

export function AgentLatestVersion({
  agentName,
  latestVersion,
  timedOut,
}: {
  agentName: AgentName;
  latestVersion?: string;
  timedOut?: boolean;
}) {
  if (!timedOut) {
    return latestVersion ? <>{latestVersion}</> : <>{NOT_AVAILABLE_LABEL}</>;
  }

  return (
    <EuiToolTip
      content={i18n.translate(
        'xpack.apm.agentExplorer.agentLatestVersion.airGappedMessage',
        {
          defaultMessage:
            'Kibana server needs public access to internet in order to get latest {agentName} agent released version.',
          values: { agentName },
        }
      )}
    >
      <>{NOT_AVAILABLE_LABEL}</>
    </EuiToolTip>
  );
}
