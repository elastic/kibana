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
import { Integration } from '../../../common/data_streams_stats/integration';
import { IntegrationIcon } from '../common';
import { FieldsList } from './fields_list';

export function IntegrationSummary({ integration }: { integration: Integration }) {
  const { name, version } = integration;
  return (
    <FieldsList
      title={flyoutIntegrationDetailsText}
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
        },
        {
          fieldTitle: flyoutIntegrationVersionText,
          fieldValue: version,
        },
      ]}
    />
  );
}
