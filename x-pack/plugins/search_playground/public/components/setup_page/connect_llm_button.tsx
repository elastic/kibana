/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import { GenerativeAIForSearchPlaygroundConnectorFeatureId } from '@kbn/actions-plugin/common';
import { useKibana } from '../../hooks/use_kibana';
import { useLoadConnectors } from '../../hooks/use_load_connectors';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { AnalyticsEvents } from '../../analytics/constants';

export const ConnectLLMButton: React.FC = () => {
  const [connectorFlyoutOpen, setConnectorFlyoutOpen] = useState(false);
  const [showCallout, setShowAddedCallout] = useState(false);
  const {
    services: {
      triggersActionsUi: { getAddConnectorFlyout: ConnectorFlyout },
    },
  } = useKibana();
  const { data: connectors, refetch: refetchConnectors } = useLoadConnectors();
  const usageTracker = useUsageTracker();
  const handleConnectorCreated = () => {
    refetchConnectors();
    setShowAddedCallout(true);
    setConnectorFlyoutOpen(false);
  };
  const handleSetupGenAiConnector = () => {
    usageTracker?.click(AnalyticsEvents.genAiConnectorCreated);
    setConnectorFlyoutOpen(true);
  };

  useEffect(() => {
    if (connectors?.length) {
      if (showCallout) {
        usageTracker?.load(AnalyticsEvents.genAiConnectorAdded);
      } else {
        usageTracker?.load(AnalyticsEvents.genAiConnectorExists);
      }
    } else {
      usageTracker?.load(AnalyticsEvents.genAiConnectorSetup);
    }
  }, [connectors?.length, showCallout, usageTracker]);

  return (
    <>
      {connectors?.length ? (
        <EuiButtonEmpty
          iconType="check"
          color="success"
          onClick={handleSetupGenAiConnector}
          data-test-subj="successConnectLLMButton"
        >
          <FormattedMessage
            id="xpack.searchPlayground.setupPage.llmConnectedButtonLabel"
            defaultMessage="LLM connected"
          />
        </EuiButtonEmpty>
      ) : (
        <EuiButton
          fill
          iconType="link"
          data-test-subj="connectLLMButton"
          onClick={handleSetupGenAiConnector}
        >
          <FormattedMessage
            id="xpack.searchPlayground.setupPage.connectLLMButtonLabel"
            defaultMessage="Connect to an LLM"
          />
        </EuiButton>
      )}
      {connectorFlyoutOpen && (
        <ConnectorFlyout
          featureId={GenerativeAIForSearchPlaygroundConnectorFeatureId}
          onConnectorCreated={handleConnectorCreated}
          onClose={() => setConnectorFlyoutOpen(false)}
        />
      )}
    </>
  );
};
