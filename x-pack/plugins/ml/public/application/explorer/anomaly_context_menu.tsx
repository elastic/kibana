/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useCasesModal } from '../contexts/kibana/use_cases_modal';
import { DEFAULT_MAX_SERIES_TO_PLOT } from '../services/anomaly_explorer_charts_service';
import { ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE } from '../../embeddables';
import { useTimeRangeUpdates } from '../contexts/kibana/use_timefilter';
import { useMlKibana } from '../contexts/kibana';
import type { AppStateSelectedCells, ExplorerJob } from './explorer_utils';
import { TimeRangeBounds } from '../util/time_buckets';
import { AddAnomalyChartsToDashboardControl } from './dashboard_controls/add_anomaly_charts_to_dashboard_controls';

interface AnomalyContextMenuProps {
  selectedJobs: ExplorerJob[];
  selectedCells?: AppStateSelectedCells | null;
  bounds?: TimeRangeBounds;
  interval?: number;
  chartsCount: number;
}
export const AnomalyContextMenu: FC<AnomalyContextMenuProps> = ({
  selectedJobs,
  selectedCells,
  bounds,
  interval,
  chartsCount,
}) => {
  const {
    services: {
      application: { capabilities },
      cases,
    },
  } = useMlKibana();
  const globalTimeRange = useTimeRangeUpdates(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAddDashboardsActive, setIsAddDashboardActive] = useState(false);

  const closePopoverOnAction = useCallback(
    (actionCallback: Function) => {
      setIsMenuOpen(false);
      actionCallback();
    },
    [setIsMenuOpen]
  );

  const openCasesModal = useCasesModal(ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE);

  const canEditDashboards = capabilities.dashboard?.createNew ?? false;
  const casesPrivileges = cases?.helpers.canUseCases();

  const menuItems = useMemo(() => {
    const items = [];
    if (canEditDashboards) {
      items.push(
        <EuiContextMenuItem
          key="addToDashboard"
          onClick={closePopoverOnAction.bind(null, setIsAddDashboardActive.bind(null, true))}
          data-test-subj="mlAnomalyAddChartsToDashboardButton"
        >
          <FormattedMessage
            id="xpack.ml.explorer.anomalies.addToDashboardLabel"
            defaultMessage="Add to dashboard"
          />
        </EuiContextMenuItem>
      );
    }

    if (!!casesPrivileges?.create || !!casesPrivileges?.update) {
      items.push(
        <EuiContextMenuItem
          key="attachToCase"
          onClick={closePopoverOnAction.bind(
            null,
            openCasesModal.bind(null, {
              jobIds: selectedJobs?.map((v) => v.id),
              timeRange: globalTimeRange,
              maxSeriesToPlot: DEFAULT_MAX_SERIES_TO_PLOT,
            })
          )}
          data-test-subj="mlAnomalyAttachChartsToCasesButton"
        >
          <FormattedMessage id="xpack.ml.explorer.attachToCaseLabel" defaultMessage="Add to case" />
        </EuiContextMenuItem>
      );
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEditDashboards, globalTimeRange, closePopoverOnAction, selectedJobs]);

  const jobIds = selectedJobs.map(({ id }) => id);

  return (
    <>
      {menuItems.length > 0 && chartsCount > 0 ? (
        <EuiFlexItem grow={false} css={{ marginLeft: 'auto', alignSelf: 'baseline' }}>
          <EuiPopover
            button={
              <EuiButtonIcon
                size="s"
                aria-label={i18n.translate('xpack.ml.explorer.anomalies.actionsAriaLabel', {
                  defaultMessage: 'Actions',
                })}
                color="text"
                iconType="boxesHorizontal"
                onClick={setIsMenuOpen.bind(null, !isMenuOpen)}
                data-test-subj="mlExplorerAnomalyPanelMenu"
                disabled={chartsCount < 1}
              />
            }
            isOpen={isMenuOpen}
            closePopover={setIsMenuOpen.bind(null, false)}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiPopoverTitle paddingSize="s">
              {i18n.translate('xpack.ml.explorer.anomalies.actionsPopoverLabel', {
                defaultMessage: 'Anomaly charts',
              })}
            </EuiPopoverTitle>
            <EuiContextMenuPanel items={menuItems} />
          </EuiPopover>
        </EuiFlexItem>
      ) : null}
      {isAddDashboardsActive && selectedJobs ? (
        <AddAnomalyChartsToDashboardControl
          onClose={async () => {
            setIsAddDashboardActive(false);
          }}
          selectedCells={selectedCells}
          bounds={bounds}
          interval={interval}
          jobIds={jobIds}
        />
      ) : null}
    </>
  );
};
