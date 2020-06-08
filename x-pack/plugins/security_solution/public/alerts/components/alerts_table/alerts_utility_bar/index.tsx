/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import React, { useCallback } from 'react';
import numeral from '@elastic/numeral';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AlertStateStatus } from '../../../../../common/detection_engine/types';
import { LinkIcon } from '../../../../common/components/link_icon';
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

interface AlertsUtilityBarProps {
  canUserCRUD: boolean;
  hasIndexWrite: boolean;
  areEventsLoading: boolean;
  clearSelection: () => void;
  currentFilter: AlertStateStatus;
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
    async (selectedStatus: AlertStateStatus) => {
      await updateAlertsStatus({
        alertIds: Object.keys(selectedEventIds),
        status: currentFilter,
        selectedStatus,
      });
    },
    [selectedEventIds, updateAlertsStatus]
  );

  const formattedTotalCount = numeral(totalCount).format(defaultNumberFormat);
  const formattedSelectedEventsCount = numeral(Object.keys(selectedEventIds).length).format(
    defaultNumberFormat
  );

  const UtilityToolbar = (closePopover: () => void) => {
    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem style={{ minWidth: 175 }}>
          <LinkIcon
            iconType={'securitySignalResolved'}
            onClick={() => handleUpdateStatus('closed')}
          >
            {'Close Selected'}
          </LinkIcon>
        </EuiFlexItem>

        <EuiFlexItem style={{ minWidth: 175 }}>
          <LinkIcon iconType={'alert'} onClick={() => handleUpdateStatus('in-progress')}>
            {'Mark in progress'}
          </LinkIcon>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

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
                  dataTestSubj="openCloseAlert"
                  disabled={areEventsLoading || isEmpty(selectedEventIds)}
                  iconType="arrowDown"
                  iconSide="right"
                  popoverContent={UtilityToolbar}
                >
                  {'Take Action'}
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
