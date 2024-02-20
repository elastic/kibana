/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useState } from 'react';
import type { Pagination } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { useRiskInputActionsPanels } from '../hooks/use_risk_input_actions_panels';
import type { AlertRawData } from '../tabs/risk_inputs/risk_inputs_tab';

interface Props {
  selectedAlerts: AlertRawData[];
  pagination: Pagination;
}

export const RiskInputsUtilityBar: FunctionComponent<Props> = React.memo(
  ({ selectedAlerts, pagination }) => {
    const { euiTheme } = useEuiTheme();
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
    const closePopover = useCallback(() => setIsPopoverOpen(false), []);
    const panels = useRiskInputActionsPanels(selectedAlerts, closePopover);
    const displayedCurrentPage = pagination.pageIndex + 1;
    const pageSize = pagination.pageSize ?? 10;
    const fromItem: number = pagination.pageIndex * pageSize + 1;
    const toItem: number = Math.min(pagination.totalItemCount, pageSize * displayedCurrentPage);

    return (
      <>
        <EuiFlexGroup
          data-test-subj="risk-input-utility-bar"
          alignItems="center"
          justifyContent="flexStart"
          gutterSize="m"
        >
          <EuiFlexItem
            grow={false}
            css={css`
              padding: ${euiTheme.size.s} 0;
            `}
          >
            <EuiText size="xs">
              {pagination.totalItemCount <= 1 ? (
                <FormattedMessage
                  id="xpack.securitySolution.flyout.entityDetails.riskInputs.utilityBar.selectionTextSingle"
                  defaultMessage="Showing {totalContributions} {riskInputs}"
                  values={{
                    totalContributions: pagination.totalItemCount,
                    riskInputs: (
                      <b>
                        <FormattedMessage
                          id="xpack.securitySolution.flyout.entityDetails.riskInputs.utilityBar.riskInput"
                          defaultMessage="Risk contribution"
                        />
                      </b>
                    ),
                  }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.flyout.entityDetails.riskInputs.utilityBar.selectionTextRange"
                  defaultMessage="Showing {displayedRange} of {totalContributions} {riskContributions}"
                  values={{
                    displayedRange: <b>{`${fromItem}-${toItem}`}</b>,
                    totalContributions: pagination.totalItemCount,
                    riskContributions: (
                      <b>
                        <FormattedMessage
                          id="xpack.securitySolution.flyout.entityDetails.riskInputs.utilityBar.riskInputs"
                          defaultMessage="Risk contributions"
                        />
                      </b>
                    ),
                  }}
                />
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {selectedAlerts.length > 0 && (
              <EuiPopover
                isOpen={isPopoverOpen}
                closePopover={closePopover}
                panelPaddingSize="none"
                button={
                  <EuiButtonEmpty
                    onClick={togglePopover}
                    size="xs"
                    iconSide="right"
                    iconType="arrowDown"
                    flush="left"
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.entityDetails.riskInputs.utilityBar.text"
                      defaultMessage="{totalSelectedContributions} selected risk contribution"
                      values={{
                        totalSelectedContributions: selectedAlerts.length,
                      }}
                    />
                  </EuiButtonEmpty>
                }
              >
                <EuiContextMenu panels={panels} initialPanelId={0} />
              </EuiPopover>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);

RiskInputsUtilityBar.displayName = 'RiskInputsUtilityBar';
