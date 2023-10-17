/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonText } from '@elastic/eui';
import React, { useMemo } from 'react';
import usePreviousDistinct from 'react-use/lib/usePreviousDistinct';
import { usePluginConfig } from '../../../../containers/plugin_config_context';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useMetadataStateProviderContext } from '../../hooks/use_metadata_state';

export const Osquery = () => {
  const { metadata, loading } = useMetadataStateProviderContext();

  const prevAgentId = usePreviousDistinct(metadata?.info?.agent?.id, (prev, curr) => {
    // When a host has multiple agents reporting metrics, it might be that one of them is not reporting an agent id.
    // This returns the previous state when the current agent.id is null and the previous is not,
    // ensuring that it doesn't lose the valid known agent.id
    return !!prev && !curr;
  });
  const agentId = useMemo(() => prevAgentId ?? 'null', [prevAgentId]);
  const { featureFlags } = usePluginConfig();

  if (!featureFlags.osqueryEnabled) {
    return null;
  }

  const isLoading = loading && !metadata;
  return isLoading ? <EuiSkeletonText lines={10} /> : <MemoOsQueryAction agentId={agentId} />;
};

const MemoOsQueryAction = React.memo(({ agentId }: { agentId: string }) => {
  const {
    services: { osquery },
  } = useKibanaContextForPlugin();

  // @ts-expect-error
  const OsqueryAction = osquery?.OsqueryAction;

  return !OsqueryAction ? (
    <EuiSkeletonText lines={10} />
  ) : (
    <OsqueryAction agentId={agentId} hideAgentsField formType="simple" />
  );
});
