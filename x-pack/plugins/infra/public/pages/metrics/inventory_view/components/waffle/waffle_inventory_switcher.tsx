/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPopover, EuiContextMenu, EuiContextMenuPanelDescriptor } from '@elastic/eui';

import React, { useCallback, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { findInventoryModel } from '../../../../../../common/inventory_models';
import { InventoryItemType } from '../../../../../../common/inventory_models/types';
import { useWaffleOptionsContext } from '../../hooks/use_waffle_options';
import { DropdownButton } from '../dropdown_button';

const getDisplayNameForType = (type: InventoryItemType) => {
  const inventoryModel = findInventoryModel(type);
  return inventoryModel.displayName;
};

export const WaffleInventorySwitcher: React.FC = () => {
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
  const openPopover = useCallback(() => setIsOpen(true), []);
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
            },
          ],
        },
        {
          id: 'awsPanel',
          title: 'AWS',
          items: [
            {
              name: getDisplayNameForType('awsEC2'),
              onClick: goToAwsEC2,
            },
            {
              name: getDisplayNameForType('awsS3'),
              onClick: goToAwsS3,
            },
            {
              name: getDisplayNameForType('awsRDS'),
              onClick: goToAwsRDS,
            },
            {
              name: getDisplayNameForType('awsSQS'),
              onClick: goToAwsSQS,
            },
          ],
        },
      ] as EuiContextMenuPanelDescriptor[],
    [goToAwsEC2, goToAwsRDS, goToAwsS3, goToAwsSQS, goToDocker, goToHost, goToK8]
  );

  const selectedText = useMemo(() => {
    return getDisplayNameForType(nodeType);
  }, [nodeType]);

  const button = (
    <DropdownButton
      data-test-subj={'openInventorySwitcher'}
      onClick={openPopover}
      label={i18n.translate('xpack.infra.waffle.showLabel', { defaultMessage: 'Show' })}
    >
      {selectedText}
    </DropdownButton>
  );

  return (
    <EuiPopover
      id="contextMenu"
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      withTitle
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId="firstPanel" panels={panels} />
    </EuiPopover>
  );
};
