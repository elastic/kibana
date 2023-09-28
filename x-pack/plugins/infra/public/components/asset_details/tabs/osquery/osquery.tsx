/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonText } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useMetadataStateProviderContext } from '../../hooks/use_metadata_state';

export const Osquery = () => {
  const { metadata, loading: metadataLoading } = useMetadataStateProviderContext();

  const {
    services: { osquery },
  } = useKibanaContextForPlugin();

  // @ts-expect-error
  const OsqueryAction = osquery?.OsqueryAction;

  // avoids component rerender when resizing the popover
  const content = useMemo(() => {
    // TODO: Add info when Osquery plugin is not available
    if (metadataLoading || !OsqueryAction) {
      return <EuiSkeletonText lines={10} />;
    }

    return <OsqueryAction agentId={metadata?.info?.agent?.id} hideAgentsField formType="simple" />;
  }, [OsqueryAction, metadataLoading, metadata]);

  return content;
};
