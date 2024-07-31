/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';

import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiBasicTable,
  EuiButton,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import type { EntityResolutionSuggestion } from '@kbn/elastic-assistant-common';

import {
  ATTACK_DISCOVERY_STORAGE_KEY,
  ConnectorSelectorInline,
  DEFAULT_ASSISTANT_NAMESPACE,
  useAssistantContext,
  useLoadConnectors,
} from '@kbn/elastic-assistant';
import { noop } from 'lodash/fp';
import { useLocalStorage } from 'react-use';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { CONNECTOR_ID_LOCAL_STORAGE_KEY } from '../../../attack_discovery/pages/helpers';
import { EntityDetailsLeftPanelTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { ExpandablePanel } from '../../../flyout/shared/components/expandable_panel';
import type { UseEntityResolution } from '../../api/hooks/use_entity_resolutions';

interface Props {
  resolution: UseEntityResolution;
  onOpen: (tab: EntityDetailsLeftPanelTab) => void;
}

export const RelatedEntitiesSummary: React.FC<Props> = ({ resolution, onOpen }) => {
  const header = {
    title: <EuiText>{'Related Entities'}</EuiText>,
    link: {
      callback: () => onOpen(EntityDetailsLeftPanelTab.OBSERVED_DATA),
      tooltip: 'View all related entities',
    },
  };

  return (
    <ExpandablePanel header={header}>
      <RelatedEntitiesSummaryContent resolution={resolution} onOpen={onOpen} />
    </ExpandablePanel>
  );
};

export const RelatedEntitiesSummaryContent: React.FC<Props> = ({ resolution, onOpen }) => {
  const spaceId = useSpaceId() ?? 'default';
  // get the last selected connector ID from local storage:
  const [localStorageAttackDiscoveryConnectorId, setLocalStorageAttackDiscoveryConnectorId] =
    useLocalStorage<string>(
      `${DEFAULT_ASSISTANT_NAMESPACE}.${ATTACK_DISCOVERY_STORAGE_KEY}.${spaceId}.${CONNECTOR_ID_LOCAL_STORAGE_KEY}`
    );

  const [connectorId, setConnectorId] = React.useState<string | undefined>(
    localStorageAttackDiscoveryConnectorId
  );

  const onConnectorIdSelected = useCallback(
    (selectedConnectorId: string) => {
      setConnectorId(selectedConnectorId);
      setLocalStorageAttackDiscoveryConnectorId(selectedConnectorId);
      resolution.setConnectorId(selectedConnectorId);
    },
    [resolution, setLocalStorageAttackDiscoveryConnectorId]
  );

  const { http } = useAssistantContext();

  const { data: aiConnectors } = useLoadConnectors({
    http,
  });

  useEffect(() => {
    // If there is only one connector, set it as the selected connector
    if (aiConnectors != null && aiConnectors.length === 1) {
      setConnectorId(aiConnectors[0].id);
    } else if (aiConnectors != null && aiConnectors.length === 0) {
      // connectors have been removed, reset the connectorId and cached Attack discoveries
      setConnectorId(undefined);
    }
  }, [aiConnectors, resolution]);

  if (resolution.verifications.isLoading) {
    return <EuiLoadingSpinner size="xl" />;
  }

  if (resolution.verifications.data && resolution.verifications.data.length > 0) {
    return (
      <EuiBasicTable
        tableCaption="Verified as the same entity"
        items={resolution.verifications.data}
        rowHeader="firstName"
        columns={entityColumns}
      />
    );
  }

  if (resolution.scanning) {
    return <EuiLoadingSpinner size="xl" />;
  }

  if (!resolution.candidateData) {
    return (
      <>
        <EuiButton
          onClick={() => {
            resolution.setScanning(true);
            onOpen(EntityDetailsLeftPanelTab.OBSERVED_DATA);
          }}
        >
          {'Scan related entities'}
        </EuiButton>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>{'LLM model'}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ConnectorSelectorInline
              onConnectorSelected={noop}
              onConnectorIdSelected={onConnectorIdSelected}
              selectedConnectorId={connectorId}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }

  return (
    <EuiText>{`Found ${resolution.resolutions.candidates.length} potential related entities`}</EuiText>
  );
};

const entityColumns: Array<EuiBasicTableColumn<EntityResolutionSuggestion>> = [
  {
    field: 'related_entity.name',
    name: 'Entity',

    render: (name: string) => <EuiText>{name}</EuiText>,
  },
];
