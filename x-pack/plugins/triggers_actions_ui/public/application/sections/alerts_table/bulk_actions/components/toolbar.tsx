/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover, EuiButtonEmpty, EuiContextMenu } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useState, useCallback, useMemo, useContext, useEffect } from 'react';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import {
  ALERT_CASE_IDS,
  ALERT_RULE_NAME,
  ALERT_RULE_UUID,
  ALERT_WORKFLOW_TAGS,
} from '@kbn/rule-data-utils';
import {
  Alerts,
  BulkActionsPanelConfig,
  BulkActionsVerbs,
  RowSelection,
} from '../../../../../types';
import * as i18n from '../translations';
import { BulkActionsContext } from '../context';

interface BulkActionsProps {
  totalItems: number;
  panels: BulkActionsPanelConfig[];
  alerts: Alerts;
  setIsBulkActionsLoading: (loading: boolean) => void;
  clearSelection: () => void;
  refresh: () => void;
}

// Duplicated just for legacy reasons. Timelines plugin will be removed but
// as long as the integration still work with Timelines we have to keep it
export interface TimelineItem {
  _id: string;
  _index?: string | null;
  data: TimelineNonEcsData[];
  ecs: { _id: string; _index: string };
}

export interface TimelineNonEcsData {
  field: string;
  value?: string[] | null;
}

const DEFAULT_NUMBER_FORMAT = 'format:number:defaultPattern';
const containerStyles = { display: 'inline-block', position: 'relative' } as const;

const selectedIdsToTimelineItemMapper = (
  alerts: Alerts,
  rowSelection: RowSelection
): TimelineItem[] => {
  return Array.from(rowSelection.keys()).map((rowIndex: number) => {
    const alert = alerts[rowIndex];
    return {
      _id: alert._id,
      _index: alert._index,
      data: [
        { field: ALERT_RULE_NAME, value: alert[ALERT_RULE_NAME] },
        { field: ALERT_RULE_UUID, value: alert[ALERT_RULE_UUID] },
        { field: ALERT_CASE_IDS, value: alert[ALERT_CASE_IDS] ?? [] },
        { field: ALERT_WORKFLOW_TAGS, value: alert[ALERT_WORKFLOW_TAGS] ?? [] },
      ],
      ecs: {
        _id: alert._id,
        _index: alert._index,
      },
    };
  });
};

const useBulkActionsToMenuPanelMapper = (
  panels: BulkActionsPanelConfig[],
  // in case the action takes time, client can set the alerts to a loading
  // state and back when done
  setIsBulkActionsLoading: BulkActionsProps['setIsBulkActionsLoading'],
  // Once the bulk action has been completed, it can set the selection to false.
  clearSelection: BulkActionsProps['clearSelection'],
  // In case bulk item action changes the alert data and need to refresh table page.
  refresh: BulkActionsProps['refresh'],
  alerts: Alerts,
  closeIfPopoverIsOpen: () => void
) => {
  const [{ isAllSelected, rowSelection }] = useContext(BulkActionsContext);

  const bulkActionsPanels = useMemo(() => {
    const bulkActionPanelsToReturn = [];
    for (const panel of panels) {
      const selectedAlertItems = selectedIdsToTimelineItemMapper(alerts, rowSelection);
      if (panel.items) {
        const newItems = panel.items.map((item) => {
          const isDisabled = isAllSelected && item.disableOnQuery;
          return {
            key: item.key,
            'data-test-subj': item['data-test-subj'],
            disabled: isDisabled,
            onClick: item.onClick
              ? () => {
                  closeIfPopoverIsOpen();
                  item.onClick?.(
                    selectedAlertItems,
                    isAllSelected,
                    setIsBulkActionsLoading,
                    clearSelection,
                    refresh
                  );
                }
              : undefined,
            name: isDisabled && item.disabledLabel ? item.disabledLabel : item.label,
            panel: item.panel,
          };
        });
        bulkActionPanelsToReturn.push({ ...panel, items: newItems });
      } else {
        const ContentPanel = panel.renderContent({
          alertItems: selectedAlertItems,
          isAllSelected,
          setIsBulkActionsLoading,
          clearSelection,
          refresh,
          closePopoverMenu: closeIfPopoverIsOpen,
        });
        bulkActionPanelsToReturn.push({ ...panel, content: ContentPanel });
      }
    }
    return bulkActionPanelsToReturn;
  }, [
    alerts,
    clearSelection,
    isAllSelected,
    panels,
    refresh,
    rowSelection,
    setIsBulkActionsLoading,
    closeIfPopoverIsOpen,
  ]);

  return bulkActionsPanels;
};

const BulkActionsComponent: React.FC<BulkActionsProps> = ({
  totalItems,
  panels,
  alerts,
  setIsBulkActionsLoading,
  clearSelection,
  refresh,
}) => {
  const [{ rowSelection, isAllSelected }, updateSelectedRows] = useContext(BulkActionsContext);
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const [showClearSelection, setShowClearSelectiong] = useState(false);

  useEffect(() => {
    setShowClearSelectiong(isAllSelected);
  }, [isAllSelected]);

  const selectedCount = rowSelection.size;

  const formattedTotalCount = useMemo(
    () => numeral(totalItems).format(defaultNumberFormat),
    [defaultNumberFormat, totalItems]
  );
  const formattedSelectedEventsCount = useMemo(
    () => numeral(selectedCount).format(defaultNumberFormat),
    [defaultNumberFormat, selectedCount]
  );

  const toggleIsActionOpen = useCallback(() => {
    setIsActionsPopoverOpen((currentIsOpen) => !currentIsOpen);
  }, [setIsActionsPopoverOpen]);

  const closeActionPopover = useCallback(() => {
    setIsActionsPopoverOpen(false);
  }, [setIsActionsPopoverOpen]);

  const closeIfPopoverIsOpen = useCallback(() => {
    if (isActionsPopoverOpen) {
      setIsActionsPopoverOpen(false);
    }
  }, [isActionsPopoverOpen]);

  const bulkActionPanels = useBulkActionsToMenuPanelMapper(
    panels,
    setIsBulkActionsLoading,
    clearSelection,
    refresh,
    alerts,
    closeIfPopoverIsOpen
  );

  const toggleSelectAll = useCallback(() => {
    if (!showClearSelection) {
      updateSelectedRows({ action: BulkActionsVerbs.selectAll });
    } else {
      updateSelectedRows({ action: BulkActionsVerbs.clear });
    }
  }, [showClearSelection, updateSelectedRows]);

  const selectedAlertsText = useMemo(
    () =>
      showClearSelection
        ? i18n.SELECTED_ALERTS(formattedTotalCount, totalItems)
        : i18n.SELECTED_ALERTS(formattedSelectedEventsCount, selectedCount),
    [
      showClearSelection,
      formattedTotalCount,
      formattedSelectedEventsCount,
      totalItems,
      selectedCount,
    ]
  );

  const selectClearAllAlertsText = useMemo(
    () =>
      showClearSelection
        ? i18n.CLEAR_SELECTION
        : i18n.SELECT_ALL_ALERTS(formattedTotalCount, totalItems),
    [showClearSelection, formattedTotalCount, totalItems]
  );

  return (
    <div style={containerStyles} data-test-subj="bulk-actions-button-container" aria-hidden>
      <EuiPopover
        isOpen={isActionsPopoverOpen}
        anchorPosition="upCenter"
        panelPaddingSize="none"
        button={
          <EuiButtonEmpty
            aria-label="selectedShowBulkActions"
            data-test-subj="selectedShowBulkActionsButton"
            size="xs"
            iconType="arrowDown"
            iconSide="right"
            color="primary"
            onClick={toggleIsActionOpen}
          >
            {selectedAlertsText}
          </EuiButtonEmpty>
        }
        closePopover={closeActionPopover}
      >
        <EuiContextMenu size="s" initialPanelId={0} panels={bulkActionPanels} />
      </EuiPopover>
      <EuiButtonEmpty
        size="xs"
        aria-label="selectAllAlerts"
        data-test-subj="selectAllAlertsButton"
        iconType={showClearSelection ? 'cross' : 'pagesSelect'}
        onClick={toggleSelectAll}
      >
        {selectClearAllAlertsText}
      </EuiButtonEmpty>
    </div>
  );
};

// disabled to be able lazy load
// eslint-disable-next-line import/no-default-export
export default React.memo(BulkActionsComponent);
