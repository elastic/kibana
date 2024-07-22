/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiBadge, EuiText } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import {
  flyoutIntegrationDetailsText,
  flyoutIntegrationNameText,
  flyoutIntegrationVersionText,
} from '../../../common/translations';
import { IntegrationIcon } from '../common';
import { FieldsList } from './fields_list';
import { IntegrationActionsMenu } from './integration_actions_menu';
import { Integration } from '../../../common/data_streams_stats/integration';
import { Dashboard } from '../../../common/api_types';

export function IntegrationSummary({
  integration,
  dashboards,
  dashboardsLoading,
}: {
  integration: Integration;
  dashboards: Dashboard[];
  dashboardsLoading: boolean;
}) {
  const { name, version } = integration;

  const integrationActionsMenu = (
    <IntegrationActionsMenu
      integration={integration}
      dashboards={dashboards}
      dashboardsLoading={dashboardsLoading}
    />
  );
  return (
    <FieldsList
      title={flyoutIntegrationDetailsText}
      actionsMenu={integrationActionsMenu}
      fields={[
        {
          fieldTitle: flyoutIntegrationNameText,
          fieldValue: (
            <EuiBadge
              color="hollow"
              css={css`
                width: fit-content;
              `}
            >
              <EuiFlexGroup gutterSize="xs" alignItems="center">
                <IntegrationIcon integration={integration} />
                <EuiText size="s">{name}</EuiText>
              </EuiFlexGroup>
            </EuiBadge>
          ),
          isLoading: false,
        },
        {
          fieldTitle: flyoutIntegrationVersionText,
          fieldValue: version,
          isLoading: false,
        },
      ]}
    />
  );
}
