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
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { useMlKibana } from '../contexts/kibana';
import type { ExplorerJob } from './explorer_utils';
import { AddExplorerChartsToDashboardControl } from './dashboard_controls/add_explorer_chart_to_dashboard_control';

interface AnomaliesContextMenuProps {
  selectedJobs: ExplorerJob[];
}
export const AnomaliesContextMenu: FC<AnomaliesContextMenuProps> = ({ selectedJobs }) => {
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
            id="xpack.ml.explorer.addToDashboardLabel"
            defaultMessage="Add anomaly charts to dashboard"
          />
        </EuiContextMenuItem>
      );
    }
    return items;
  }, [canEditDashboards]);

  return (
    <>
      {menuItems.length > 0 && (
        <EuiFlexItem grow={false} style={{ marginLeft: 'auto', alignSelf: 'baseline' }}>
          <EuiPopover
            button={
              <EuiButtonIcon
                size="s"
                aria-label={i18n.translate('xpack.ml.explorer.swimlaneActions', {
                  defaultMessage: 'Actions',
                })}
                color="subdued"
                iconType="boxesHorizontal"
                onClick={setIsMenuOpen.bind(null, !isMenuOpen)}
                data-test-subj="mlAnomalyChartsPanelMenu"
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
      {isAddDashboardsActive && selectedJobs && (
        <AddExplorerChartsToDashboardControl
          onClose={async (callback) => {
            setIsAddDashboardActive(false);
            if (callback) {
              await callback();
            }
          }}
          jobIds={selectedJobs.map(({ id }) => id)}
          viewBy={'Overall'}
        />
      )}
    </>
  );
};
