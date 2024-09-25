/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { TechnicalPreviewBadge } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ENTITY_INVENTORY_LOCATOR_ID } from '@kbn/observability-shared-plugin/common';
import { SerializableRecord } from '@kbn/utility-types';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

export interface InventoryCalloutProps {
  onDissmiss: () => void;
}

export function InventoryCallout({ onDissmiss }: InventoryCalloutProps) {
  const { share } = useApmPluginContext();
  const inventoryLocator = share.url.locators.get<SerializableRecord>(ENTITY_INVENTORY_LOCATOR_ID);

  return (
    <EuiFlexGroup direction="row" alignItems="center" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <TechnicalPreviewBadge icon="beaker" style={{ verticalAlign: 'middle' }} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink data-test-subj="inventoryCalloutLink" href={inventoryLocator?.useUrl({})}>
          <FormattedMessage
            id="xpack.apm.inventoryCallout.linklabel"
            defaultMessage="Try our new Inventory!"
          />
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            <FormattedMessage
              id="xpack.apm.inventoryCallout.linkTooltip"
              defaultMessage="Hide this"
            />
          }
        >
          <EuiButtonIcon
            data-test-subj="inventoryCalloutDismiss"
            iconType="cross"
            onClick={onDissmiss}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
