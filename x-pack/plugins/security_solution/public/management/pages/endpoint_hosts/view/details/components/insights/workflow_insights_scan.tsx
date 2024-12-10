/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import {
  AssistantAvatar,
  DEFEND_INSIGHTS_STORAGE_KEY,
  ConnectorSelectorInline,
  DEFAULT_ASSISTANT_NAMESPACE,
  useLoadConnectors,
} from '@kbn/elastic-assistant';
import { noop } from 'lodash/fp';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { some } from 'lodash';
import { useSpaceId } from '../../../../../../../common/hooks/use_space_id';
import { WORKFLOW_INSIGHTS } from '../../../translations';
import { useKibana } from '../../../../../../../common/lib/kibana';

export const WorkflowInsightsScanSection = () => {
  const CONNECTOR_ID_LOCAL_STORAGE_KEY = 'connectorId';

  const spaceId = useSpaceId() ?? 'default';
  const { http } = useKibana().services;
  const { data: aiConnectors } = useLoadConnectors({
    http,
  });

  // Store the selected connector id in local storage so that it persists across page reloads
  const [localStorageWorkflowInsightsConnectorId, setLocalStorageWorkflowInsightsConnectorId] =
    useLocalStorage<string>(
      `${DEFAULT_ASSISTANT_NAMESPACE}.${DEFEND_INSIGHTS_STORAGE_KEY}.${spaceId}.${CONNECTOR_ID_LOCAL_STORAGE_KEY}`
    );

  const [connectorId, setConnectorId] = React.useState<string | undefined>(
    localStorageWorkflowInsightsConnectorId
  );

  const onConnectorIdSelected = useCallback(
    (selectedConnectorId: string) => {
      setConnectorId(selectedConnectorId);
      setLocalStorageWorkflowInsightsConnectorId(selectedConnectorId);
    },
    [setLocalStorageWorkflowInsightsConnectorId]
  );

  // Check if the selected connector exists in the list of connectors, i.e. it is not deleted
  const connectorExists = useMemo(
    () => some(aiConnectors, ['id', connectorId]),
    [aiConnectors, connectorId]
  );

  // Render the scan button only if a connector is selected
  const renderScanButton = useMemo(() => {
    if (!connectorExists) {
      return null;
    }
    return (
      <EuiFlexItem grow={false}>
        <EuiButton size="s">{WORKFLOW_INSIGHTS.scan.button}</EuiButton>
      </EuiFlexItem>
    );
  }, [connectorExists]);

  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <AssistantAvatar size={'xs'} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <h4>{WORKFLOW_INSIGHTS.scan.title}</h4>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <ConnectorSelectorInline
                onConnectorSelected={noop}
                onConnectorIdSelected={onConnectorIdSelected}
                selectedConnectorId={connectorId}
              />
            </EuiFlexItem>
            {renderScanButton}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
