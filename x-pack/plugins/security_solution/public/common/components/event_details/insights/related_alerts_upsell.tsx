/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiText } from '@elastic/eui';

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { INSIGHTS_UPSELL } from './translations';
import { useKibana } from '../../../lib/kibana';

const UpsellContainer = euiStyled.div`
  border: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  padding: 12px;
  border-radius: 6px;
`;

const StyledIcon = euiStyled(EuiIcon)`
  margin-right: 10px;
`;

export const RelatedAlertsUpsell = React.memo(() => {
  const { application } = useKibana().services;
  return (
    <UpsellContainer>
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <StyledIcon size="m" type="lock" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <EuiLink
              color="subdued"
              target="_blank"
              href={application.getUrlForApp('management', {
                path: 'stack/license_management/home',
              })}
            >
              {INSIGHTS_UPSELL}
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </UpsellContainer>
  );
});

RelatedAlertsUpsell.displayName = 'RelatedAlertsUpsell';
