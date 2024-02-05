/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover, EuiContextMenu, EuiContextMenuPanelDescriptor } from '@elastic/eui';

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { findInventoryModel, ItemTypeRT } from '@kbn/metrics-data-access-plugin/common';
import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { IntegrationSummary } from '@kbn/observability-plugin/public';
import { EuiLoadingSpinner } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { useWaffleOptionsContext } from '../../hooks/use_waffle_options';
import { DropdownButton } from '../dropdown_button';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';

const getDisplayNameForType = (type: InventoryItemType) => {
  const inventoryModel = findInventoryModel(type);
  return inventoryModel.displayName;
};

export const WaffleInventorySwitcher: React.FC = () => {
  const {
    services: { http },
  } = useKibanaContextForPlugin();

  const {
    changeNodeType,
    changeGroupBy,
    changeMetric,
    changeAccount,
    changeRegion,
    changeCustomMetrics,
    nodeType,
  } = useWaffleOptionsContext();
  const [isOpen, setIsOpen] = useState(false);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePopover = useCallback(() => setIsOpen((currentIsOpen) => !currentIsOpen), []);
  const goToNodeType = useCallback(
    (targetNodeType: InventoryItemType) => {
      closePopover();
      changeNodeType(targetNodeType);
      changeGroupBy([]);
      changeCustomMetrics([]);
      changeAccount('');
      changeRegion('');
      const inventoryModel = findInventoryModel(targetNodeType);
      changeMetric({
        type: inventoryModel.metrics.defaultSnapshot,
      });
    },
    [
      closePopover,
      changeNodeType,
      changeGroupBy,
      changeCustomMetrics,
      changeAccount,
      changeRegion,
      changeMetric,
    ]
  );
  const goToHost = useCallback(() => goToNodeType('host'), [goToNodeType]);
  const goToK8 = useCallback(() => goToNodeType('pod'), [goToNodeType]);
  const goToDocker = useCallback(() => goToNodeType('container'), [goToNodeType]);
  const goToAwsEC2 = useCallback(() => goToNodeType('awsEC2'), [goToNodeType]);
  const goToAwsS3 = useCallback(() => goToNodeType('awsS3'), [goToNodeType]);
  const goToAwsRDS = useCallback(() => goToNodeType('awsRDS'), [goToNodeType]);
  const goToAwsSQS = useCallback(() => goToNodeType('awsSQS'), [goToNodeType]);

  const goToIntegration = useCallback(
    (integrationName: string) => {
      closePopover();
      changeNodeType(integrationName);
    },
    [changeNodeType, closePopover]
  );
  const [integrations, setIntegrations] = useState<IntegrationSummary[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  useEffect(() => {
    async function fetchInstalledIntegrations() {
      const response = await http.get<{ integrations: IntegrationSummary[] }>(
        '/api/observability/integrations/installed'
      );
      setIntegrations(response.integrations);
      setIntegrationsLoading(false);
    }

    fetchInstalledIntegrations();
  }, [http]);

  const panels = useMemo(
    () =>
      [
        {
          id: 'firstPanel',
          items: [
            {
              'data-test-subj': 'goToHost',
              name: getDisplayNameForType('host'),
              onClick: goToHost,
            },
            {
              'data-test-subj': 'goToPods',
              name: getDisplayNameForType('pod'),
              onClick: goToK8,
            },
            {
              'data-test-subj': 'goToDocker',
              name: getDisplayNameForType('container'),
              onClick: goToDocker,
            },
            {
              name: 'AWS',
              panel: 'awsPanel',
              'data-test-subj': 'goToAWS-open',
            },
            ...(integrations.length !== 0
              ? integrations.map((integration) => ({
                  name: integration.display_name,
                  panel: `${integration.display_name}Panel`,
                }))
              : []),
          ],
        },
        {
          id: 'awsPanel',
          title: 'AWS',
          items: [
            {
              name: getDisplayNameForType('awsEC2'),
              onClick: goToAwsEC2,
              'data-test-subj': 'goToAWS-EC2',
            },
            {
              name: getDisplayNameForType('awsS3'),
              onClick: goToAwsS3,
              'data-test-subj': 'goToAWS-S3',
            },
            {
              name: getDisplayNameForType('awsRDS'),
              onClick: goToAwsRDS,
              'data-test-subj': 'goToAWS-RDS',
            },
            {
              name: getDisplayNameForType('awsSQS'),
              onClick: goToAwsSQS,
              'data-test-subj': 'goToAWS-SQS',
            },
          ],
        },
        ...(integrations.length !== 0
          ? integrations.map((integration) => ({
              id: `${integration.display_name}Panel`,
              title: integration.display_name,
              items: integration.assets.map((asset) => ({
                name: asset.display_name,
                onClick: () => {
                  goToIntegration(`${integration.name}:${asset.name}`);
                },
              })),
            }))
          : []),
      ] as EuiContextMenuPanelDescriptor[],
    [
      goToAwsEC2,
      goToAwsRDS,
      goToAwsS3,
      goToAwsSQS,
      goToDocker,
      goToHost,
      goToK8,
      integrations,
      goToIntegration,
    ]
  );

  const selectedText = useMemo(() => {
    if (ItemTypeRT.is(nodeType)) {
      return getDisplayNameForType(nodeType);
    }

    const [integrationName, assetName] = nodeType.split(':');

    const matchedIntegration = integrations.find(
      (integration) => integration.name === integrationName
    );
    const matchedAsset = matchedIntegration?.assets.find((asset) => asset.name === assetName);
    if (matchedIntegration && matchedAsset) {
      // Would be nice with an icon here?
      return `${matchedIntegration.display_name} - ${matchedAsset.display_name}`;
    }

    return 'Loading...';
  }, [integrations, nodeType]);

  const button = (
    <DropdownButton
      data-test-subj={'openInventorySwitcher'}
      onClick={togglePopover}
      label={i18n.translate('xpack.infra.waffle.showLabel', { defaultMessage: 'Show' })}
      showKubernetesInfo={true}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>{selectedText}</EuiFlexItem>
        {integrationsLoading ? (
          <EuiFlexItem>
            <EuiLoadingSpinner />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </DropdownButton>
  );

  return (
    <EuiPopover
      id="contextMenu"
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId="firstPanel" panels={panels} />
    </EuiPopover>
  );
};
