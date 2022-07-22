/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiButtonIcon, EuiContextMenu, useEuiShadow } from '@elastic/eui';
import { FETCH_STATUS } from '@kbn/observability-plugin/public';
import { useTheme } from '@kbn/observability-plugin/public';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { MonitorOverviewItem } from '../../../../../../../common/runtime_types';
import { useMonitorEnableHandler } from '../../../../hooks/use_monitor_enable_handler';
import { quietFetchOverviewAction } from '../../../../state/overview/actions';
import { selectOverviewState } from '../../../../state/overview/selectors';
import { useEditMonitorLocator } from '../../hooks/use_edit_monitor_locator';
import { useMonitorDetailLocator } from '../../hooks/use_monitor_detail_locator';

const ActionTrayItem = styled.div<{ borderRadius: string; boxShadow: string }>`
  // position
  display: inline-block;
  position: relative;
  bottom: 42px;
  left: 12px;
  z-index: 1;

  // style
  border-radius: ${({ borderRadius }) => borderRadius};
  ${({ boxShadow }) => boxShadow}
`;

export function ActionsPopover({
  isPopoverOpen,
  setIsPopoverOpen,
  monitor,
}: {
  isPopoverOpen: boolean;
  monitor: MonitorOverviewItem;
  setIsPopoverOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const theme = useTheme();
  const euiShadow = useEuiShadow('l');
  const dispatch = useDispatch();
  const { pageState } = useSelector(selectOverviewState);
  const forceRefreshOnEnabledChange = useCallback(() => {
    dispatch(quietFetchOverviewAction.get(pageState));
  }, [dispatch, pageState]);
  const detailUrl = useMonitorDetailLocator({
    monitorId: monitor.id,
    locationId: monitor.location.id,
  });
  const labels = useMemo(
    () => ({
      enabledSuccessLabel: enabledSuccessLabel(monitor.name),
      disabledSuccessLabel: disabledSuccessLabel(monitor.name),
      failureLabel: enabledFailLabel(monitor.name),
    }),
    [monitor.name]
  );
  const { status, isEnabled, setIsEnabled } = useMonitorEnableHandler({
    id: monitor.id,
    monitor,
    reloadPage: forceRefreshOnEnabledChange,
    labels,
  });
  const editUrl = useEditMonitorLocator({ monitorId: monitor.id });
  const [enableLabel, setEnableLabel] = useState(
    monitor.isEnabled ? 'Disable monitor' : 'Enable monitor'
  );
  useEffect(() => {
    if (status === FETCH_STATUS.LOADING) {
      setEnableLabel('Loading...');
    } else if (status === FETCH_STATUS.SUCCESS && isEnabled === monitor.isEnabled) {
      setEnableLabel(monitor.isEnabled ? 'Disable monitor' : 'Enable monitor');
    }
  }, [setEnableLabel, status, isEnabled, monitor.isEnabled]);
  return (
    <ActionTrayItem boxShadow={euiShadow} borderRadius={theme.eui.euiBorderRadius}>
      <EuiPopover
        button={
          <EuiButtonIcon
            aria-label="View options"
            iconType="boxesHorizontal"
            color="primary"
            size="s"
            display="base"
            style={{ backgroundColor: theme.eui.euiColorLightestShade }}
            onClick={() => setIsPopoverOpen((b) => !b)}
          />
        }
        color="lightestShade"
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        anchorPosition="rightUp"
        panelPaddingSize="none"
      >
        <EuiContextMenu
          initialPanelId={0}
          panels={[
            {
              id: '0',
              title: 'Actions',
              items: [
                {
                  name: 'Go to monitor',
                  icon: 'sortRight',
                  href: detailUrl,
                },
                // not rendering this for now because it requires the detail flyout
                // which is not merged yet. Also, this needs to be rendered conditionally,
                // the actions menu can be opened within the flyout so there is no point in showing this
                // if the user is already in the flyout.
                // {
                //   name: 'Quick inspect',
                //   icon: 'inspect',
                // },
                // not rendering this for now because the manual test flyout is
                // still in the design phase
                // {
                //   name: 'Run test manually',
                //   icon: 'beaker',
                // },
                {
                  name: 'Edit monitor',
                  icon: 'pencil',
                  href: editUrl,
                },
                {
                  name: enableLabel,
                  icon: 'invert',
                  onClick: () => {
                    if (status !== FETCH_STATUS.LOADING) setIsEnabled(!monitor.isEnabled);
                  },
                },
              ],
            },
          ]}
        />
      </EuiPopover>
    </ActionTrayItem>
  );
}

const enabledSuccessLabel = (name: string) =>
  i18n.translate('xpack.synthetics.overview.actions.enabledSuccessLabel', {
    defaultMessage: 'Monitor "{name}" enabled successfully',
    values: { name },
  });

export const disabledSuccessLabel = (name: string) =>
  i18n.translate('xpack.synthetics.overview.actions.disabledSuccessLabel', {
    defaultMessage: 'Monitor "{name}" disabled successfully.',
    values: { name },
  });

export const enabledFailLabel = (name: string) =>
  i18n.translate('xpack.synthetics.overview.actions.enabledFailLabel', {
    defaultMessage: 'Unable to update monitor "{name}".',
    values: { name },
  });
