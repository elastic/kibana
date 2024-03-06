/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import type { AlertRawData } from '../tabs/risk_inputs/risk_inputs_tab';
import { useRiskInputActionsPanels } from '../hooks/use_risk_input_actions_panels';

interface ActionColumnProps {
  alert: AlertRawData;
}

export const ActionColumn: React.FC<ActionColumnProps> = ({ alert }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);
  const alerts = useMemo(() => [alert], [alert]);
  const panels = useRiskInputActionsPanels(alerts, closePopover);

  return (
    <EuiPopover
      data-test-subj="risk-inputs-actions"
      button={
        <EuiButtonIcon
          onClick={togglePopover}
          iconType="boxesHorizontal"
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.entityDetails.riskInputs.actions.ariaLabel',
            {
              defaultMessage: 'Actions',
            }
          )}
          color="text"
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
