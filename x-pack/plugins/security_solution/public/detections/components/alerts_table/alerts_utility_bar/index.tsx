/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React, { useCallback } from 'react';
import numeral from '@elastic/numeral';

import { EuiFlexGroup, EuiFlexItem, EuiCheckbox } from '@elastic/eui';
import styled from 'styled-components';

import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { Link } from '../../../../common/components/link_icon';
import { DEFAULT_NUMBER_FORMAT } from '../../../../../common/constants';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarSpacer,
  UtilityBarText,
} from '../../../../common/components/utility_bar';
import * as i18n from './translations';
import { useUiSetting$ } from '../../../../common/lib/kibana';
import { TimelineNonEcsData } from '../../../../../common/search_strategy/timeline';
import { UpdateAlertsStatus } from '../types';
import { FILTER_CLOSED, FILTER_ACKNOWLEDGED, FILTER_OPEN } from '../alerts_filter_group';

export interface AlertsUtilityBarProps {
  areEventsLoading: boolean;
  clearSelection: () => void;
  currentFilter: Status;
  hasIndexMaintenance: boolean;
  hasIndexWrite: boolean;
  onShowBuildingBlockAlertsChanged: (showBuildingBlockAlerts: boolean) => void;
  onShowOnlyThreatIndicatorAlertsChanged: (showOnlyThreatIndicatorAlerts: boolean) => void;
  selectAll: () => void;
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showBuildingBlockAlerts: boolean;
  showClearSelection: boolean;
  showOnlyThreatIndicatorAlerts: boolean;
  totalCount: number;
  updateAlertsStatus: UpdateAlertsStatus;
}

const UtilityBarFlexGroup = styled(EuiFlexGroup)`
  min-width: 175px;
`;

const AdditionalFiltersItem = styled(EuiFlexItem)`
  padding: ${({ theme }) => theme.eui.paddingSizes.s};
`;

const BuildingBlockContainer = styled(AdditionalFiltersItem)`
  background: ${({ theme }) => theme.eui.euiColorHighlight};
`;

const AlertsUtilityBarComponent: React.FC<AlertsUtilityBarProps> = ({
  areEventsLoading,
  clearSelection,
  currentFilter,
  hasIndexMaintenance,
  hasIndexWrite,
  onShowBuildingBlockAlertsChanged,
  onShowOnlyThreatIndicatorAlertsChanged,
  selectAll,
  selectedEventIds,
  showBuildingBlockAlerts,
  showClearSelection,
  showOnlyThreatIndicatorAlerts,
  totalCount,
  updateAlertsStatus,
}) => {
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  const handleUpdateStatus = useCallback(
    async (selectedStatus: Status) => {
      await updateAlertsStatus({
        alertIds: Object.keys(selectedEventIds),
        status: currentFilter,
        selectedStatus,
      });
    },
    [currentFilter, selectedEventIds, updateAlertsStatus]
  );

  const formattedTotalCount = numeral(totalCount).format(defaultNumberFormat);
  const formattedSelectedEventsCount = numeral(Object.keys(selectedEventIds).length).format(
    defaultNumberFormat
  );

  const UtilityBarPopoverContent = (closePopover: () => void) => (
    <UtilityBarFlexGroup direction="column">
      {currentFilter !== FILTER_OPEN && (
        <EuiFlexItem>
          <Link
            aria-label="openSelectedAlerts"
            onClick={() => {
              closePopover();
              handleUpdateStatus('open');
            }}
            color="text"
            data-test-subj="openSelectedAlertsButton"
          >
            {i18n.BATCH_ACTION_OPEN_SELECTED}
          </Link>
        </EuiFlexItem>
      )}

      {currentFilter !== FILTER_CLOSED && (
        <EuiFlexItem>
          <Link
            aria-label="closeSelectedAlerts"
            onClick={() => {
              closePopover();
              handleUpdateStatus('closed');
            }}
            color="text"
            data-test-subj="closeSelectedAlertsButton"
          >
            {i18n.BATCH_ACTION_CLOSE_SELECTED}
          </Link>
        </EuiFlexItem>
      )}

      {currentFilter !== FILTER_ACKNOWLEDGED && (
        <EuiFlexItem>
          <Link
            aria-label="markSelectedAlertsAcknowledged"
            onClick={() => {
              closePopover();
              handleUpdateStatus('acknowledged');
            }}
            color="text"
            data-test-subj="markSelectedAlertsAcknowledgedButton"
          >
            {i18n.BATCH_ACTION_ACKNOWLEDGED_SELECTED}
          </Link>
        </EuiFlexItem>
      )}
    </UtilityBarFlexGroup>
  );

  const handleSelectAllAlertsClick = useCallback(() => {
    if (!showClearSelection) {
      selectAll();
    } else {
      clearSelection();
    }
  }, [clearSelection, selectAll, showClearSelection]);

  return (
    <>
      <UtilityBar>
        <UtilityBarSection grow={true}>
          <UtilityBarGroup>
            <UtilityBarText dataTestSubj="showingAlerts">
              {i18n.SHOWING_ALERTS(formattedTotalCount, totalCount)}
            </UtilityBarText>
          </UtilityBarGroup>

          <UtilityBarGroup grow={true}>
            {hasIndexWrite && hasIndexMaintenance && (
              <>
                <UtilityBarText dataTestSubj="selectedAlerts">
                  {i18n.SELECTED_ALERTS(
                    showClearSelection ? formattedTotalCount : formattedSelectedEventsCount,
                    showClearSelection ? totalCount : Object.keys(selectedEventIds).length
                  )}
                </UtilityBarText>

                <UtilityBarAction
                  dataTestSubj="alertActionPopover"
                  disabled={
                    areEventsLoading || (isEmpty(selectedEventIds) && showClearSelection === false)
                  }
                  iconType="arrowDown"
                  iconSide="right"
                  ownFocus={false}
                  popoverContent={UtilityBarPopoverContent}
                >
                  {i18n.TAKE_ACTION}
                </UtilityBarAction>

                <UtilityBarAction
                  aria-label="selectAllAlerts"
                  dataTestSubj="selectAllAlertsButton"
                  iconType={showClearSelection ? 'cross' : 'pagesSelect'}
                  onClick={handleSelectAllAlertsClick}
                >
                  {showClearSelection
                    ? i18n.CLEAR_SELECTION
                    : i18n.SELECT_ALL_ALERTS(formattedTotalCount, totalCount)}
                </UtilityBarAction>
              </>
            )}
            <UtilityBarSpacer />
            <AditionalFiltersAction
              areEventsLoading={areEventsLoading}
              onShowBuildingBlockAlertsChanged={onShowBuildingBlockAlertsChanged}
              showBuildingBlockAlerts={showBuildingBlockAlerts}
              onShowOnlyThreatIndicatorAlertsChanged={onShowOnlyThreatIndicatorAlertsChanged}
              showOnlyThreatIndicatorAlerts={showOnlyThreatIndicatorAlerts}
            />
          </UtilityBarGroup>
        </UtilityBarSection>
      </UtilityBar>
    </>
  );
};

export const AlertsUtilityBar = React.memo(
  AlertsUtilityBarComponent,
  (prevProps, nextProps) =>
    prevProps.areEventsLoading === nextProps.areEventsLoading &&
    prevProps.selectedEventIds === nextProps.selectedEventIds &&
    prevProps.totalCount === nextProps.totalCount &&
    prevProps.showClearSelection === nextProps.showClearSelection &&
    prevProps.showBuildingBlockAlerts === nextProps.showBuildingBlockAlerts &&
    prevProps.showOnlyThreatIndicatorAlerts === nextProps.showOnlyThreatIndicatorAlerts
);

export const AditionalFiltersAction = ({
  areEventsLoading,
  onShowBuildingBlockAlertsChanged,
  showBuildingBlockAlerts,
  onShowOnlyThreatIndicatorAlertsChanged,
  showOnlyThreatIndicatorAlerts,
}: {
  areEventsLoading: boolean;
  onShowBuildingBlockAlertsChanged: (showBuildingBlockAlerts: boolean) => void;
  showBuildingBlockAlerts: boolean;
  onShowOnlyThreatIndicatorAlertsChanged: (showOnlyThreatIndicatorAlerts: boolean) => void;
  showOnlyThreatIndicatorAlerts: boolean;
}) => {
  const UtilityBarAdditionalFiltersContent = (closePopover: () => void) => (
    <UtilityBarFlexGroup direction="column" gutterSize="none">
      <BuildingBlockContainer>
        <EuiCheckbox
          id="showBuildingBlockAlertsCheckbox"
          aria-label="showBuildingBlockAlerts"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            closePopover();
            onShowBuildingBlockAlertsChanged(e.target.checked);
          }}
          checked={showBuildingBlockAlerts}
          color="text"
          data-test-subj="showBuildingBlockAlertsCheckbox"
          label={i18n.ADDITIONAL_FILTERS_ACTIONS_SHOW_BUILDING_BLOCK}
        />
      </BuildingBlockContainer>
      <AdditionalFiltersItem>
        <EuiCheckbox
          id="showOnlyThreatIndicatorAlertsCheckbox"
          aria-label="showOnlyThreatIndicatorAlerts"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            closePopover();
            onShowOnlyThreatIndicatorAlertsChanged(e.target.checked);
          }}
          checked={showOnlyThreatIndicatorAlerts}
          color="text"
          data-test-subj="showOnlyThreatIndicatorAlertsCheckbox"
          label={i18n.ADDITIONAL_FILTERS_ACTIONS_SHOW_ONLY_THREAT_INDICATOR_ALERTS}
        />
      </AdditionalFiltersItem>
    </UtilityBarFlexGroup>
  );

  return (
    <UtilityBarAction
      dataTestSubj="additionalFilters"
      disabled={areEventsLoading}
      iconType="arrowDown"
      iconSide="right"
      ownFocus={true}
      popoverContent={UtilityBarAdditionalFiltersContent}
    >
      {i18n.ADDITIONAL_FILTERS_ACTIONS}
    </UtilityBarAction>
  );
};
