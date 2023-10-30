/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { TableId } from '@kbn/securitysolution-data-table';
import type { SimpleRiskInput } from '../../../common/risk_engine';
import { useAddToCaseActions } from '../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions';
import { useNavigateToTimeline } from '../../overview/components/detection_response/hooks/use_navigate_to_timeline';
import { isActiveTimeline } from '../../helpers';

interface ActionColumnProps {
  riskInput: SimpleRiskInput;
  scopeId: string;
}

/**
 * The returned actions only support alerts risk inputs.
 * @param riskInput
 * @returns
 */
const useRiskInputActions = (
  riskInput: SimpleRiskInput,
  scopeId: string,
  closePopover: () => void
) => {
  const { openTimelineWithFilters } = useNavigateToTimeline();
  const { handleAddToExistingCaseClick, handleAddToNewCaseClick } = useAddToCaseActions({
    ecsData: {
      _id: riskInput.id,
      _index: riskInput.index,
      event: {
        kind: ['signal'],
      },
    },
    onMenuItemClick: closePopover,
    onSuccess: () => Promise.resolve(),
    // isActiveTimelines: isActiveTimeline(scopeId ?? ''),
    isActiveTimelines: isActiveTimeline(scopeId),
    isInDetections: [TableId.alertsOnAlertsPage, TableId.alertsOnRuleDetailsPage].includes(
      scopeId as TableId
    ),
    refetch: () => {},
    // ariaLabel: ATTACH_ALERT_TO_CASE_FOR_ROW({ ariaRowindex, columnValues }),
  });

  // closePopover

  return useMemo(
    () => ({
      addToExistingCase: handleAddToExistingCaseClick,
      addToNewCaseClick: handleAddToNewCaseClick,
      addToNewTimeline: () => {
        closePopover();
        openTimelineWithFilters([
          [
            {
              field: '_id',
              value: riskInput.id,
            },
          ],
        ]);
      },
    }),
    [
      closePopover,
      handleAddToExistingCaseClick,
      handleAddToNewCaseClick,
      openTimelineWithFilters,
      riskInput.id,
    ]
  );
};

export const ActionColumn: React.FC<ActionColumnProps> = ({ riskInput, scopeId }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);

  const { addToExistingCase, addToNewCaseClick, addToNewTimeline } = useRiskInputActions(
    riskInput,
    scopeId,
    closePopover
  );

  const panels = useMemo(() => {
    return [
      {
        title: riskInput.description,
        id: 0,
        items: [
          {
            name: (
              <FormattedMessage
                id="xpack.securitySolution.flyout.riskInputs.actions.addToNewTimeline"
                defaultMessage="Add to new timeline"
              />
            ),

            onClick: addToNewTimeline,
          },
          {
            name: (
              <FormattedMessage
                id="xpack.securitySolution.flyout.riskInputs.actions.addToNewCase"
                defaultMessage="Add to new case"
              />
            ),

            onClick: addToNewCaseClick,
          },

          {
            name: (
              <FormattedMessage
                id="xpack.securitySolution.flyout.riskInputs.actions.addToExistingCase"
                defaultMessage="Add to existing case"
              />
            ),

            onClick: addToExistingCase,
          },
        ],
      },
    ];
  }, [addToExistingCase, addToNewCaseClick, addToNewTimeline, riskInput.description]);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          onClick={togglePopover}
          iconType="boxesHorizontal"
          aria-label={i18n.translate('xpack.securitySolution.flyout.riskInputs.actions.ariaLabel', {
            defaultMessage: 'Actions',
          })}
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
