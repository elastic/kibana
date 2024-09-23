/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useLoadConnectors } from '@kbn/elastic-assistant';
import type { AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';
import type { SetComplete } from '../../../../../../types';
import { useKibana } from '../../../../../../../common/lib/kibana';
import { ConnectorSetup } from '../connector_setup/connector_setup';

const AllowedActionTypeIds = ['.bedrock', '.gen-ai', '.gemini'];

interface ConfigureConnectorProps {
  setComplete: SetComplete;
}

export const ConfigureConnector = React.memo<ConfigureConnectorProps>(({ setComplete }) => {
  const { http } = useKibana().services;
  const [connectors, setConnectors] = useState<AIConnector[]>();
  const { isLoading, data: aiConnectors, refetch: refetchConnectors } = useLoadConnectors({ http });
  const hasConnectors = !isLoading && connectors?.length;

  useEffect(() => {
    if (aiConnectors != null) {
      const filteredAiConnectors = aiConnectors.filter(({ actionTypeId }) =>
        AllowedActionTypeIds.includes(actionTypeId)
      );
      setConnectors(filteredAiConnectors);
    }
    if (hasConnectors) {
      setComplete(true);
    }
  }, [aiConnectors, setComplete, hasConnectors]);

  const onConnectorSaved = useCallback(() => refetchConnectors(), [refetchConnectors]);

  if (isLoading) return <p>{'loading'}</p>;

  return (
    <ConnectorSetup
      connectors={connectors}
      actionTypeIds={AllowedActionTypeIds}
      onConnectorSaved={onConnectorSaved}
    />
  );
});
ConfigureConnector.displayName = 'ConfigureConnector';
