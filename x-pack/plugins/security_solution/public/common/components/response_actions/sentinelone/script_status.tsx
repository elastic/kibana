/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBasicTable } from '@elastic/eui';
import { useKibana } from '../../../lib/kibana';
import { useSubAction } from '../../../../timelines/components/side_panel/event_details/flyout/use_sub_action';
import { useLoadConnectors } from '../use_load_connectors';

const SentinelOneScriptStatusComponent = ({ parentTaskId }: { parentTaskId: string }) => {
  const { http } = useKibana().services;
  // Connector details
  const { data: connectors } = useLoadConnectors({ http });

  const connectorId = useMemo(() => connectors?.[0].id, [connectors]);

  const subActionResults = useSubAction({
    connectorId,
    subAction: 'getRemoteScriptStatus',
    subActionParams: {
      parentTaskId,
    },
  });

  const columns = [
    {
      field: 'description',
      name: 'Description',
    },
    {
      field: 'agentComputerName',
      name: 'Target',
    },
    {
      field: 'status',
      name: 'Status',
    },
    {
      field: 'detailedStatus',
      name: 'Detailed Status',
    },
  ];

  // @ts-expect-error update types
  return <EuiBasicTable items={subActionResults?.data?.data?.data ?? []} columns={columns} />;
};

export const SentinelOneScriptStatus = React.memo(SentinelOneScriptStatusComponent);
