/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonText } from '@elastic/eui';
import React, { useMemo } from 'react';
import { usePluginConfig } from '../../../../containers/plugin_config_context';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useMetadataStateProviderContext } from '../../hooks/use_metadata_state';

export const Osquery = () => {
  const { featureFlags } = usePluginConfig();
  const { metadata, loading: metadataLoading } = useMetadataStateProviderContext();

  const {
    services: { osquery },
  } = useKibanaContextForPlugin();

  // @ts-expect-error
  const OsqueryAction = osquery?.OsqueryAction;

  // avoids component rerender when resizing the popover
  const content = useMemo(() => {
    if (!featureFlags.osqueryEnabled) {
      return null;
    }
    return <OsqueryAction agentId={metadata?.info?.agent?.id} hideAgentsField formType="simple" />;
  }, [OsqueryAction, featureFlags.osqueryEnabled, metadata?.info?.agent?.id]);

  const isLoading = metadataLoading && (!metadata || !OsqueryAction);
  return isLoading && featureFlags.osqueryEnabled ? <EuiSkeletonText lines={10} /> : content;
};
