/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { alertsLocatorID } from '@kbn/observability-plugin/common';
import { Entity } from '../../../common/entities';
import { getIdentityFieldValues } from '../../../common/utils/get_identity_fields_values';
import { useKibana } from '../../hooks/use_kibana';

export function AlertsBadge({ entity }: { entity: Entity }) {
  const identityFieldValues = getIdentityFieldValues({ entity });
  const {
    services: { share },
  } = useKibana();

  const alertsLocator = share.url.locators.get(alertsLocatorID);

  const alertsLink = alertsLocator?.getRedirectUrl({
    kuery: identityFieldValues.join(' AND '),
    status: 'active',
  });

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
      <EuiBadge iconType="warning" color="danger" href={alertsLink}>
        {entity.alertsCount}
      </EuiBadge>
    </EuiToolTip>
  );
}
