/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { useLoadConnectors } from '@kbn/elastic-assistant';
import type { AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';
import type { SetComplete } from '../../../../../../types';
import { useKibana } from '../../../../../../../common/lib/kibana';
import { ConnectorCards } from '../connector_cards/connector_cards';

const AllowedActionTypeIds = ['.bedrock', '.gen-ai', '.gemini'];

interface ConfigureConnectorProps {
  setComplete: SetComplete;
}

export const ConfigureConnector = React.memo<ConfigureConnectorProps>(({ setComplete }) => {
  const { http } = useKibana().services;
  const { isLoading, data: aiConnectors, refetch: refetchConnectors } = useLoadConnectors({ http });
  const [connectors, setConnectors] = useState<AIConnector[]>([]);

  useEffect(() => {
    if (aiConnectors) {
      const filteredConnectors = aiConnectors.filter(({ actionTypeId }) =>
        AllowedActionTypeIds.includes(actionTypeId)
      );
      setConnectors(filteredConnectors);
      setComplete(filteredConnectors.length > 0);
    }
  }, [aiConnectors, setComplete]);

  const onConnectorSaved = () => refetchConnectors();

  if (isLoading) return null;

  return (
    <ConnectorCards
      connectors={connectors}
      actionTypeIds={AllowedActionTypeIds}
      onConnectorSaved={onConnectorSaved}
    />
  );
});
ConfigureConnector.displayName = 'ConfigureConnector';
