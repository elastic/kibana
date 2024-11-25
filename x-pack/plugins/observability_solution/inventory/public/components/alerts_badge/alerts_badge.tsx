/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import rison from '@kbn/rison';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InventoryEntity } from '../../../common/entities';
import { useKibana } from '../../hooks/use_kibana';

export function AlertsBadge({ entity }: { entity: InventoryEntity }) {
  const {
    services: {
      http: { basePath },
      entityManager,
    },
  } = useKibana();

  const activeAlertsHref = basePath.prepend(
    `/app/observability/alerts?_a=${rison.encode({
      kuery: entityManager.entityClient.asKqlFilter({
        entity: {
          identity_fields: entity.entityIdentityFields,
        },
        ...entity,
      }),
      status: 'active',
    })}`
  );
  return (
    <EuiToolTip
      position="bottom"
      content={i18n.translate(
        'xpack.inventory.home.serviceAlertsTable.tooltip.activeAlertsExplanation',
        {
          defaultMessage: 'Active alerts',
        }
      )}
    >
      <EuiBadge
        data-test-subj="inventoryAlertsBadgeLink"
        iconType="warning"
        color="danger"
        iconSide="left"
        href={activeAlertsHref}
      >
        {entity.alertsCount}
      </EuiBadge>
    </EuiToolTip>
  );
}
