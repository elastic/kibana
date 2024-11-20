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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ApmPluginStartDeps } from '../../../../plugin';

interface EntitiesInventoryCalloutProps {
  onDismiss: () => void;
}

export function EntitiesInventoryCallout({ onDismiss }: EntitiesInventoryCalloutProps) {
  const { services } = useKibana<ApmPluginStartDeps>();
  const { observabilityShared } = services;

  const entitiesInventoryLocator = observabilityShared.locators.entitiesInventory;

  return (
    <EuiFlexGroup direction="row" alignItems="center" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <TechnicalPreviewBadge icon="beaker" style={{ verticalAlign: 'middle' }} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink
          data-test-subj="apmEntitiesInventoryCalloutLink"
          href={entitiesInventoryLocator.useUrl({})}
        >
          <FormattedMessage
            id="xpack.apm.entitiesInventoryCallout.linklabel"
            defaultMessage="Try our new Inventory!"
          />
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            <FormattedMessage
              id="xpack.apm.entitiesInventoryCallout.linkTooltip"
              defaultMessage="Hide this"
            />
          }
        >
          <EuiButtonIcon
            data-test-subj="apmEntitiesInventoryCalloutDismiss"
            iconType="cross"
            onClick={onDismiss}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
