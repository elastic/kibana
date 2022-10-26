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
import { selectOverviewPageState } from '../../../../state/overview/selectors';
import { useEditMonitorLocator } from '../../hooks/use_edit_monitor_locator';
import { useMonitorDetailLocator } from '../../hooks/use_monitor_detail_locator';

interface ActionContainerProps {
  boxShadow: string;
}

const ActionContainer = styled.div<ActionContainerProps>`
  // position
  display: inline-block;
  position: relative;
  bottom: 42px;
  left: 12px;
  z-index: 1;

  // style
  border-radius: ${({ theme }) => theme.eui.euiBorderRadius};
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
  const pageState = useSelector(selectOverviewPageState);

  const detailUrl = useMonitorDetailLocator({
    monitorId: monitor.id,
    locationId: monitor.location.id,
  });
  const editUrl = useEditMonitorLocator({ monitorId: monitor.id });

  const labels = useMemo(
    () => ({
      enabledSuccessLabel: enabledSuccessLabel(monitor.name),
      disabledSuccessLabel: disabledSuccessLabel(monitor.name),
      failureLabel: enabledFailLabel(monitor.name),
    }),
    [monitor.name]
  );
  const { status, isEnabled, updateMonitorEnabledState } = useMonitorEnableHandler({
    id: monitor.id,
    reloadPage: useCallback(() => {
      dispatch(quietFetchOverviewAction.get(pageState));
      setIsPopoverOpen(false);
    }, [dispatch, pageState, setIsPopoverOpen]),
    labels,
  });

  const [enableLabel, setEnableLabel] = useState(
    monitor.isEnabled ? disableMonitorLabel : enableMonitorLabel
  );

  useEffect(() => {
    if (status === FETCH_STATUS.LOADING) {
      setEnableLabel(enableLabelLoading);
    } else if (status === FETCH_STATUS.SUCCESS) {
      setEnableLabel(isEnabled ? disableMonitorLabel : enableMonitorLabel);
    }
  }, [setEnableLabel, status, isEnabled, monitor.isEnabled]);

  return (
    <ActionContainer boxShadow={euiShadow}>
      <EuiPopover
        button={
          <EuiButtonIcon
            aria-label={openActionsMenuAria}
            iconType="boxesHorizontal"
            color="primary"
            size="s"
            display="base"
            style={{ backgroundColor: theme.eui.euiColorLightestShade }}
            onClick={() => setIsPopoverOpen((b: boolean) => !b)}
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
              title: actionsMenuTitle,
              items: [
                {
                  name: actionsMenuGoToMonitorName,
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
                  name: actionsMenuEditMonitorName,
                  icon: 'pencil',
                  href: editUrl,
                },
                {
                  name: enableLabel,
                  icon: 'invert',
                  onClick: () => {
                    if (status !== FETCH_STATUS.LOADING)
                      updateMonitorEnabledState(!monitor.isEnabled);
                  },
                },
              ],
            },
          ]}
        />
      </EuiPopover>
    </ActionContainer>
  );
}

const openActionsMenuAria = i18n.translate(
  'xpack.synthetics.overview.actions.openPopover.ariaLabel',
  {
    defaultMessage: 'Open actions menu',
  }
);

const actionsMenuTitle = i18n.translate('xpack.synthetics.overview.actions.menu.title', {
  defaultMessage: 'Actions',
  description: 'This is the text in the heading of a menu containing a set of actions',
});

const actionsMenuGoToMonitorName = i18n.translate(
  'xpack.synthetics.overview.actions.goToMonitor.name',
  {
    defaultMessage: 'Go to monitor',
    description:
      'This is the text for a menu item that will take the user to the monitor detail page',
  }
);

const actionsMenuEditMonitorName = i18n.translate(
  'xpack.synthetics.overview.actions.editMonitor.name',
  {
    defaultMessage: 'Edit monitor',
    description:
      'This is the text for a menu item that will take the user to the monitor edit page',
  }
);

const enableLabelLoading = i18n.translate('xpack.synthetics.overview.actions.enableLabel', {
  defaultMessage: 'Loading...',
});

const enableMonitorLabel = i18n.translate(
  'xpack.synthetics.overview.actions.enableLabelEnableMonitor',
  {
    defaultMessage: 'Enable monitor',
  }
);

const disableMonitorLabel = i18n.translate(
  'xpack.synthetics.overview.actions.enableLabelDisableMonitor',
  {
    defaultMessage: 'Disable monitor',
  }
);

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
