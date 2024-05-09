/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useState } from 'react';

import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { useRiskInputActionsPanels } from '../hooks/use_risk_input_actions_panels';
import type { InputAlert } from '../../../hooks/use_risk_contributing_alerts';

interface Props {
  riskInputs: InputAlert[];
}

export const RiskInputsUtilityBar: FunctionComponent<Props> = React.memo(({ riskInputs }) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const panels = useRiskInputActionsPanels(riskInputs, closePopover);

  if (riskInputs.length === 0) {
    return null;
  }
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
        />
        <EuiFlexItem grow={false}>
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
                    totalSelectedContributions: riskInputs.length,
                  }}
                />
              </EuiButtonEmpty>
            }
          >
            <EuiContextMenu panels={panels} initialPanelId={0} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
    </>
  );
});

RiskInputsUtilityBar.displayName = 'RiskInputsUtilityBar';
