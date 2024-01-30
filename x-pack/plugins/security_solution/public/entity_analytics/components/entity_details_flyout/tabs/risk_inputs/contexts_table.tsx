/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { euiLightVars } from '@kbn/ui-theme';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from '@emotion/styled';
import { BasicTable } from '../../../../../common/components/ml/tables/basic_table';

import { AssetCriticalityBadgeAllowMissing } from '../../../asset_criticality';
import { isUserRiskScore } from '../../../../../../common/search_strategy';

import type { UserRiskScore, HostRiskScore } from '../../../../../../common/search_strategy';

const FieldLabel = styled.span`
  font-weight: ${euiLightVars.euiFontWeightMedium};
  color: ${euiLightVars.euiTitleColor};
`;

const columns = [
  {
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.fieldColumnTitle"
        defaultMessage="Field"
      />
    ),
    field: 'label',
    render: (label: string) => <FieldLabel>{label}</FieldLabel>,
  },
  {
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.valuesColumnTitle"
        defaultMessage="Values"
      />
    ),
    field: 'field',
    render: (field: string | undefined, { render }: { render: () => JSX.Element }) => render(),
  },
];

export const ContextsTable: React.FC<{
  riskScore?: UserRiskScore | HostRiskScore;
  loading: boolean;
}> = ({ riskScore, loading }) => {
  const criticalityLevel = useMemo(() => {
    if (!riskScore) {
      return undefined;
    }

    if (isUserRiskScore(riskScore)) {
      return riskScore.user.risk.criticality_level;
    }

    return riskScore.host.risk.criticality_level;
  }, [riskScore]);

  const items = useMemo(
    () => [
      {
        label: 'Asset Criticality Level',
        render: () => (
          <AssetCriticalityBadgeAllowMissing
            criticalityLevel={criticalityLevel}
            dataTestSubj="risk-inputs-asset-criticality-badge"
          />
        ),
      },
    ],
    [criticalityLevel]
  );

  return (
    <BasicTable
      data-test-subj="contexts-table"
      columns={columns}
      items={items}
      compressed={true}
      loading={loading}
    />
  );
};
