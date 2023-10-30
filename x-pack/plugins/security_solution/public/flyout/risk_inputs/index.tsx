/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  useEuiBackgroundColor,
  EuiSpacer,
  EuiInMemoryTable,
  EuiFlyoutBody,
  EuiTitle,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import type { RiskInputs, SimpleRiskInput } from '../../../common/risk_engine';
import { RiskScoreEntity } from '../../../common/risk_engine';
import { useRiskScore } from '../../explore/containers/risk_score';
import { ActionColumn } from './action_column';
import { PreferenceFormattedDate } from '../../common/components/formatted_date';

export interface RiskInputsPanelProps extends Record<string, unknown> {
  riskEntity: RiskScoreEntity;
  scopeId: string;
}

export interface RiskInputsExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'all-risk-inputs';
  params: RiskInputsPanelProps;
}

export const RiskInputsPanelKey: RiskInputsExpandableFlyoutProps['key'] = 'all-risk-inputs';

export const RiskInputsPanel = ({ riskEntity, scopeId }: RiskInputsPanelProps) => {
  const riskScoreState = useRiskScore({ riskEntity: RiskScoreEntity.user });

  const { data: userRisk, loading } = riskScoreState;
  const userRiskData = userRisk && userRisk.length > 0 ? userRisk[0] : undefined;
  const inputs = userRiskData?.user.risk.inputs ?? [];

  const [selectedItems, setSelectedItems] = useState<RiskInputs>([]);

  const euiTableSelectionProps = useMemo(
    () => ({
      onSelectionChange: (selected: RiskInputs) => {
        setSelectedItems(selected);
      },
      selectableMessage: (selectable: boolean) => '',
      initialSelected: [],
      selectable: () => true,
    }),
    []
  );

  const columns: Array<EuiBasicTableColumn<SimpleRiskInput>> = useMemo(
    () => [
      {
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.riskInputs.actionsColumn"
            defaultMessage="Actions"
          />
        ),
        width: '80px',
        render: (input: SimpleRiskInput) => {
          return <ActionColumn riskInput={input} scopeId={scopeId} />;
        },
      },
      {
        field: 'timestamp',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.riskInputs.dateColumn"
            defaultMessage="Date"
          />
        ),
        truncateText: false,
        mobileOptions: { show: true },
        sortable: true,
        width: '30%',
        render: (timestamp: string) => <PreferenceFormattedDate value={new Date(timestamp)} />,
      },
      {
        field: 'description',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.riskInputs.riskInputColumn"
            defaultMessage="Risk input"
          />
        ),
        truncateText: true,
        mobileOptions: { show: true },
        sortable: true,
      },
    ],
    [scopeId]
  );

  return (
    <>
      <EuiFlyoutBody
        css={css`
          background-color: ${useEuiBackgroundColor('subdued')};
        `}
      >
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.flyout.riskInputs.title"
              defaultMessage="Risk Inputs"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer />
        <EuiInMemoryTable
          compressed={true}
          loading={loading}
          items={inputs}
          columns={columns}
          pagination
          sorting
          selection={euiTableSelectionProps}
          isSelectable
          itemId="id"
        />
        <></>
      </EuiFlyoutBody>
    </>
  );
};

RiskInputsPanel.displayName = 'RiskInputsPanel';
