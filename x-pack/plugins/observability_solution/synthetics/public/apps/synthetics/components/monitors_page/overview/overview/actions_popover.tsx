/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPopover,
  EuiButtonIcon,
  EuiContextMenu,
  useEuiShadow,
  EuiPanel,
  EuiLoadingSpinner,
  EuiContextMenuPanelItemDescriptor,
  EuiToolTip,
} from '@elastic/eui';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useCreateSLO } from '../../hooks/use_create_slo';
import { TEST_SCHEDULED_LABEL } from '../../../monitor_add_edit/form/run_test_btn';
import { useCanUsePublicLocById } from '../../hooks/use_can_use_public_loc_id';
import { toggleStatusAlert } from '../../../../../../../common/runtime_types/monitor_management/alert_config';
import {
  manualTestMonitorAction,
  manualTestRunInProgressSelector,
} from '../../../../state/manual_test_runs';
import { useMonitorAlertEnable } from '../../../../hooks/use_monitor_alert_enable';
import { ConfigKey, OverviewStatusMetaData } from '../../../../../../../common/runtime_types';
import { useCanEditSynthetics } from '../../../../../../hooks/use_capabilities';
import { useMonitorEnableHandler, useLocationName, useEnablement } from '../../../../hooks';
import { setFlyoutConfig } from '../../../../state/overview/actions';
import { useEditMonitorLocator } from '../../../../hooks/use_edit_monitor_locator';
import { useMonitorDetailLocator } from '../../../../hooks/use_monitor_detail_locator';
import { NoPermissionsTooltip } from '../../../common/components/permissions';

type PopoverPosition = 'relative' | 'default';

interface ActionContainerProps {
  boxShadow: string;
  position: PopoverPosition;
}

const Container = styled.div<ActionContainerProps>`
  ${({ position }) =>
    position === 'relative'
      ? // custom styles used to overlay the popover button on `MetricItem`
        `
  display: inline-block;
  position: relative;
  bottom: 42px;
  left: 12px;
  z-index: 1;
`
      : // otherwise, no custom position needed
        ''}

  border-radius: ${({ theme }) => theme.eui.euiBorderRadius};
  ${({ boxShadow, position }) => (position === 'relative' ? boxShadow : '')}
`;

interface Props {
  isPopoverOpen: boolean;
  isInspectView?: boolean;
  monitor: OverviewStatusMetaData;
  setIsPopoverOpen: React.Dispatch<React.SetStateAction<boolean>>;
  position: PopoverPosition;
  iconHasPanel?: boolean;
  iconSize?: 's' | 'xs';
  locationId: string;
}

const CustomShadowPanel = styled(EuiPanel)<{ shadow: string }>`
  ${(props) => props.shadow}
`;

function IconPanel({ children, hasPanel }: { children: JSX.Element; hasPanel: boolean }) {
  const shadow = useEuiShadow('s');
  if (!hasPanel) return children;
  return (
    <CustomShadowPanel
      color="plain"
      element="button"
      grow={false}
      paddingSize="none"
      hasShadow={false}
      shadow={shadow}
    >
      {children}
    </CustomShadowPanel>
  );
}

export function ActionsPopover({
  isPopoverOpen,
  isInspectView,
  setIsPopoverOpen,
  monitor,
  position,
  iconHasPanel = true,
  iconSize = 's',
  locationId,
}: Props) {
  const euiShadow = useEuiShadow('l');
  const dispatch = useDispatch();
  const locationName = useLocationName(monitor);

  const { http } = useKibana().services;

  const detailUrl = useMonitorDetailLocator({
    configId: monitor.configId,
    locationId: locationId ?? monitor.locationId,
    spaceId: monitor.spaceId,
  });
  const editUrl = useEditMonitorLocator({ configId: monitor.configId, spaceId: monitor.spaceId });

  const canEditSynthetics = useCanEditSynthetics();

  const canUsePublicLocations = useCanUsePublicLocById(monitor.configId);

  const { isServiceAllowed } = useEnablement();

  const labels = useMemo(
    () => ({
      enabledSuccessLabel: enabledSuccessLabel(monitor.name),
      disabledSuccessLabel: disabledSuccessLabel(monitor.name),
      failureLabel: enabledFailLabel(monitor.name),
    }),
    [monitor.name]
  );
  const { status, isEnabled, updateMonitorEnabledState } = useMonitorEnableHandler({
    configId: monitor.configId,
    isEnabled: monitor.isEnabled,
    labels,
  });

  const { alertStatus, updateAlertEnabledState } = useMonitorAlertEnable();
  const { CreateSLOFlyout, setIsSLOFlyoutOpen } = useCreateSLO({
    configId: monitor.configId,
    label: monitor.name,
    tags: monitor.tags,
  });

  const [enableLabel, setEnableLabel] = useState(
    monitor.isEnabled ? disableMonitorLabel : enableMonitorLabel
  );

  const testInProgress = useSelector(manualTestRunInProgressSelector(monitor.configId));

  useEffect(() => {
    if (status === FETCH_STATUS.LOADING) {
      setEnableLabel(loadingLabel(monitor.isEnabled));
    } else if (status === FETCH_STATUS.SUCCESS) {
      setEnableLabel(isEnabled ? disableMonitorLabel : enableMonitorLabel);
      if (isPopoverOpen) setIsPopoverOpen(false);
    }
  }, [setEnableLabel, status, isEnabled, monitor.isEnabled, isPopoverOpen, setIsPopoverOpen]);

  const quickInspectPopoverItem = {
    name: quickInspectName,
    icon: 'inspect',
    disabled: !locationName,
    onClick: () => {
      if (locationName) {
        dispatch(
          setFlyoutConfig({
            configId: monitor.configId,
            location: locationName,
            id: monitor.configId,
            locationId: monitor.locationId,
          })
        );
        setIsPopoverOpen(false);
      }
    },
  };

  const alertLoading = alertStatus(monitor.configId) === FETCH_STATUS.LOADING;
  let popoverItems: EuiContextMenuPanelItemDescriptor[] = [
    {
      name: actionsMenuGoToMonitorName,
      icon: 'sortRight',
      href: detailUrl,
      'data-test-subj': 'actionsPopoverGoToMonitor',
    },
    quickInspectPopoverItem,
    {
      name: testInProgress ? (
        <EuiToolTip content={TEST_SCHEDULED_LABEL}>
          <span>{runTestManually}</span>
        </EuiToolTip>
      ) : (
        <NoPermissionsTooltip canUsePublicLocations={canUsePublicLocations}>
          {runTestManually}
        </NoPermissionsTooltip>
      ),
      icon: 'beaker',
      disabled: testInProgress || !canUsePublicLocations || !isServiceAllowed,
      onClick: () => {
        dispatch(manualTestMonitorAction.get({ configId: monitor.configId, name: monitor.name }));
        dispatch(setFlyoutConfig(null));
        setIsPopoverOpen(false);
      },
    },
    {
      name: (
        <NoPermissionsTooltip canEditSynthetics={canEditSynthetics}>
          {actionsMenuEditMonitorName}
        </NoPermissionsTooltip>
      ),
      icon: 'pencil',
      disabled: !canEditSynthetics || !isServiceAllowed,
      href: editUrl,
      'data-test-subj': 'editMonitorLink',
    },
    {
      name: (
        <NoPermissionsTooltip canEditSynthetics={canEditSynthetics}>
          {actionsMenuCloneMonitorName}
        </NoPermissionsTooltip>
      ),
      icon: 'copy',
      disabled: !canEditSynthetics || !isServiceAllowed,
      href: http?.basePath.prepend(`synthetics/add-monitor?cloneId=${monitor.configId}`),
      'data-test-subj': 'cloneMonitorLink',
    },
    {
      name: (
        <NoPermissionsTooltip canEditSynthetics={canEditSynthetics}>
          {CREATE_SLO}
        </NoPermissionsTooltip>
      ),
      icon: 'visGauge',
      disabled: !canEditSynthetics || !isServiceAllowed,
      onClick: () => {
        setIsPopoverOpen(false);
        setIsSLOFlyoutOpen(true);
      },
      'data-test-subj': 'createSLOBtn',
    },
    {
      name: (
        <NoPermissionsTooltip
          canEditSynthetics={canEditSynthetics}
          canUsePublicLocations={canUsePublicLocations}
        >
          {enableLabel}
        </NoPermissionsTooltip>
      ),
      icon: 'invert',
      disabled: !canEditSynthetics || !canUsePublicLocations,
      onClick: () => {
        if (status !== FETCH_STATUS.LOADING) {
          updateMonitorEnabledState(!monitor.isEnabled);
        }
      },
    },
    {
      name: (
        <NoPermissionsTooltip
          canEditSynthetics={canEditSynthetics}
          canUsePublicLocations={canUsePublicLocations}
        >
          {monitor.isStatusAlertEnabled ? disableAlertLabel : enableMonitorAlertLabel}
        </NoPermissionsTooltip>
      ),
      disabled: !canEditSynthetics || !canUsePublicLocations || !isServiceAllowed,
      icon: alertLoading ? (
        <EuiLoadingSpinner size="s" />
      ) : monitor.isStatusAlertEnabled ? (
        'bellSlash'
      ) : (
        'bell'
      ),
      onClick: () => {
        if (!alertLoading) {
          updateAlertEnabledState({
            monitor: {
              [ConfigKey.ALERT_CONFIG]: toggleStatusAlert({
                status: {
                  enabled: monitor.isStatusAlertEnabled,
                },
              }),
            },
            configId: monitor.configId,
            name: monitor.name,
          });
        }
      },
    },
  ];
  if (isInspectView) popoverItems = popoverItems.filter((i) => i !== quickInspectPopoverItem);

  return (
    <>
      <Container boxShadow={euiShadow} position={position}>
        <EuiPopover
          button={
            <IconPanel hasPanel={iconHasPanel}>
              <EuiButtonIcon
                data-test-subj="syntheticsActionsPopoverButton"
                aria-label={openActionsMenuAria}
                iconType="boxesHorizontal"
                color="primary"
                size={iconSize}
                display="empty"
                onClick={() => setIsPopoverOpen((b: boolean) => !b)}
                title={openActionsMenuAria}
              />
            </IconPanel>
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
                items: popoverItems,
              },
            ]}
          />
        </EuiPopover>
      </Container>
      {CreateSLOFlyout}
    </>
  );
}

const quickInspectName = i18n.translate('xpack.synthetics.overview.actions.quickInspect.title', {
  defaultMessage: 'Quick inspect',
});

const runTestManually = i18n.translate('xpack.synthetics.overview.actions.runTestManually.title', {
  defaultMessage: 'Run test manually',
});

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

const actionsMenuCloneMonitorName = i18n.translate(
  'xpack.synthetics.overview.actions.cloneMonitor.name',
  {
    defaultMessage: 'Clone monitor',
  }
);

const CREATE_SLO = i18n.translate('xpack.synthetics.overview.actions.createSlo.name', {
  defaultMessage: 'Create SLO',
});

const loadingLabel = (isEnabled: boolean) =>
  isEnabled
    ? i18n.translate('xpack.synthetics.overview.actions.disablingLabel', {
        defaultMessage: 'Disabling monitor',
      })
    : i18n.translate('xpack.synthetics.overview.actions.enablingLabel', {
        defaultMessage: 'Enabling monitor',
      });

const enableMonitorLabel = i18n.translate(
  'xpack.synthetics.overview.actions.enableLabelEnableMonitor',
  {
    defaultMessage: 'Enable monitor (all locations)',
  }
);

const disableMonitorLabel = i18n.translate(
  'xpack.synthetics.overview.actions.enableLabelDisableMonitor',
  {
    defaultMessage: 'Disable monitor (all locations)',
  }
);

const disableAlertLabel = i18n.translate(
  'xpack.synthetics.overview.actions.disableLabelDisableAlert',
  {
    defaultMessage: 'Disable status alerts (all locations)',
  }
);

const enableMonitorAlertLabel = i18n.translate(
  'xpack.synthetics.overview.actions.enableLabelDisableAlert',
  {
    defaultMessage: 'Enable status alerts (all locations)',
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
