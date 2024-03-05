/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonText } from '@elastic/eui';
import React, { useRef } from 'react';
import { usePluginConfig } from '../../../../containers/plugin_config_context';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useMetadataStateContext } from '../../hooks/use_metadata_state';

export const Osquery = () => {
  const { metadata, loading } = useMetadataStateContext();
  const agentId = useRef<string | undefined>(undefined);

  // When a host has multiple agents reporting metrics, it's possible that one of them may not report an agent id.
  // This ensures that once an agent id is found, it won't be replaced.
  if (metadata?.info?.agent?.id && !agentId.current) {
    agentId.current = metadata.info.agent.id;
  }

  const { featureFlags } = usePluginConfig();

  if (!featureFlags.osqueryEnabled) {
    return null;
  }

  const isLoading = loading && !metadata;
  return isLoading ? (
    <EuiSkeletonText lines={10} />
  ) : (
    // Osquery must receive an agent id for it to function in infra. There may be incomplete metric documents without this information, causing the metadata endpoint to return incomplete data.
    // To prevent incorrect Osquery form rendering, we're passing an invalid agent id. This ensures the user sees the 'not available' message instead of the form.
    <MemoOsQueryAction agentId={agentId.current ?? '_na'} />
  );
};

const MemoOsQueryAction = React.memo(({ agentId }: { agentId?: string }) => {
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
