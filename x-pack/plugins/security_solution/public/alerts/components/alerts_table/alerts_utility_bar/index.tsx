/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import React, { useCallback } from 'react';
import numeral from '@elastic/numeral';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { Link } from '../../../../common/components/link_icon';
import { DEFAULT_NUMBER_FORMAT } from '../../../../../common/constants';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../common/components/utility_bar';
import * as i18n from './translations';
import { useUiSetting$ } from '../../../../common/lib/kibana';
import { TimelineNonEcsData } from '../../../../graphql/types';
import { UpdateAlertsStatus } from '../types';
import { FILTER_CLOSED, FILTER_IN_PROGRESS, FILTER_OPEN } from '../alerts_filter_group';

interface AlertsUtilityBarProps {
  canUserCRUD: boolean;
  hasIndexWrite: boolean;
  areEventsLoading: boolean;
  clearSelection: () => void;
  currentFilter: Status;
  selectAll: () => void;
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showClearSelection: boolean;
  totalCount: number;
  updateAlertsStatus: UpdateAlertsStatus;
}

const AlertsUtilityBarComponent: React.FC<AlertsUtilityBarProps> = ({
  canUserCRUD,
  hasIndexWrite,
  areEventsLoading,
  clearSelection,
  totalCount,
  selectedEventIds,
  currentFilter,
  selectAll,
  showClearSelection,
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

  const UtilityBarFlexGroup = styled(EuiFlexGroup)`
    min-width: 175px;
  `;

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

      {currentFilter !== FILTER_IN_PROGRESS && (
        <EuiFlexItem>
          <Link
            aria-label="markSelectedAlertsInProgress"
            onClick={() => {
              closePopover();
              handleUpdateStatus('in-progress');
            }}
            color="text"
            data-test-subj="markSelectedAlertsInProgressButton"
          >
            {i18n.BATCH_ACTION_IN_PROGRESS_SELECTED}
          </Link>
        </EuiFlexItem>
      )}
    </UtilityBarFlexGroup>
  );

  return (
    <>
      <UtilityBar>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText dataTestSubj="showingAlerts">
              {i18n.SHOWING_ALERTS(formattedTotalCount, totalCount)}
            </UtilityBarText>
          </UtilityBarGroup>

          <UtilityBarGroup>
            {canUserCRUD && hasIndexWrite && (
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
                  iconType={showClearSelection ? 'cross' : 'pagesSelect'}
                  onClick={() => {
                    if (!showClearSelection) {
                      selectAll();
                    } else {
                      clearSelection();
                    }
                  }}
                >
                  {showClearSelection
                    ? i18n.CLEAR_SELECTION
                    : i18n.SELECT_ALL_ALERTS(formattedTotalCount, totalCount)}
                </UtilityBarAction>
              </>
            )}
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
    prevProps.showClearSelection === nextProps.showClearSelection
);
