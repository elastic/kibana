/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, FC } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useMlKibana } from '../contexts/kibana';
import type { AppStateSelectedCells, ExplorerJob } from './explorer_utils';
import { TimeRangeBounds } from '../util/time_buckets';
import { AddAnomalyChartsToDashboardControl } from './dashboard_controls/add_anomaly_charts_to_dashboard_controls';

interface AnomalyContextMenuProps {
  selectedJobs: ExplorerJob[];
  selectedCells?: AppStateSelectedCells;
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
    },
  } = useMlKibana();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAddDashboardsActive, setIsAddDashboardActive] = useState(false);

  const canEditDashboards = capabilities.dashboard?.createNew ?? false;

  const menuItems = useMemo(() => {
    const items = [];
    if (canEditDashboards) {
      items.push(
        <EuiContextMenuItem
          key="addToDashboard"
          onClick={setIsAddDashboardActive.bind(null, true)}
          data-test-subj="mlAnomalyAddChartsToDashboardButton"
        >
          <FormattedMessage
            id="xpack.ml.explorer.anomalies.addToDashboardLabel"
            defaultMessage="Add anomaly charts to dashboard"
          />
        </EuiContextMenuItem>
      );
    }
    return items;
  }, [canEditDashboards]);

  const jobIds = selectedJobs.map(({ id }) => id);

  return (
    <>
      {menuItems.length > 0 && chartsCount > 0 && (
        <EuiFlexItem grow={false} style={{ marginLeft: 'auto', alignSelf: 'baseline' }}>
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
            <EuiContextMenuPanel items={menuItems} />
          </EuiPopover>
        </EuiFlexItem>
      )}
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
