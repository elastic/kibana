/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiIcon,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import {
  MAX_ZOOM_LEVEL,
  MIN_ZOOM_LEVEL,
  CONTEXT_MENU_TOP_BORDER_CLASSNAME,
} from '../../../../common/lib/constants';
import { ComponentStrings } from '../../../../i18n/components';
import { flattenPanelTree } from '../../../lib/flatten_panel_tree';
import { Popover, ClosePopoverFn } from '../../popover';
import { AutoRefreshControls } from './auto_refresh_controls';
import { KioskControls } from './kiosk_controls';

const { WorkpadHeaderViewMenu: strings } = ComponentStrings;

const QUICK_ZOOM_LEVELS = [0.5, 1, 2];

export interface Props {
  /**
   * Is the workpad edittable?
   */
  isWriteable: boolean;
  /**
   * current workpad zoom level
   */
  zoomScale: number;
  /**
   * zooms to fit entire workpad into view
   */
  fitToWindow: () => void;
  /**
   * handler to set the workpad zoom level to a specific value
   */
  setZoomScale: (scale: number) => void;
  /**
   * handler to increase the workpad zoom level
   */
  zoomIn: () => void;
  /**
   * handler to decrease workpad zoom level
   */
  zoomOut: () => void;
  /**
   * reset zoom to 100%
   */
  resetZoom: () => void;
  /**
   * toggle edit/read only mode
   */
  toggleWriteable: () => void;
  /**
   * enter fullscreen mode
   */
  enterFullscreen: () => void;
  /**
   * triggers a refresh of the workpad
   */
  doRefresh: () => void;
  /**
   * Current auto refresh interval
   */
  refreshInterval: number;
  /**
   * Sets auto refresh interval
   */
  setRefreshInterval: (interval?: number) => void;
  /**
   * Is autoplay enabled?
   */
  autoplayEnabled: boolean;
  /**
   * Current autoplay interval
   */
  autoplayInterval: number;
  /**
   * Enables autoplay
   */
  enableAutoplay: (autoplay: boolean) => void;
  /**
   * Sets autoplay interval
   */
  setAutoplayInterval: (interval?: number) => void;
}

export const ViewMenu: FunctionComponent<Props> = ({
  enterFullscreen,
  fitToWindow,
  isWriteable,
  resetZoom,
  setZoomScale,
  toggleWriteable,
  zoomIn,
  zoomOut,
  zoomScale,
  doRefresh,
  refreshInterval,
  setRefreshInterval,
  autoplayEnabled,
  autoplayInterval,
  enableAutoplay,
  setAutoplayInterval,
}) => {
  const setRefresh = (val: number | undefined) => setRefreshInterval(val);

  const disableInterval = () => {
    setRefresh(0);
  };

  const viewControl = (togglePopover: React.MouseEventHandler<any>) => (
    <EuiButtonEmpty size="xs" aria-label={strings.getViewMenuLabel()} onClick={togglePopover}>
      {strings.getViewMenuButtonLabel()}
    </EuiButtonEmpty>
  );

  const getScaleMenuItems = (): EuiContextMenuPanelItemDescriptor[] =>
    QUICK_ZOOM_LEVELS.map((scale: number) => ({
      name: strings.getZoomPercentage(scale),
      icon: 'empty',
      onClick: () => setZoomScale(scale),
    }));

  const getZoomMenuItems = (): EuiContextMenuPanelItemDescriptor[] => [
    {
      name: strings.getZoomFitToWindowText(),
      icon: 'empty',
      onClick: fitToWindow,
      disabled: zoomScale === MAX_ZOOM_LEVEL,
    },
    ...getScaleMenuItems(),
    {
      name: strings.getZoomInText(),
      icon: 'magnifyWithPlus',
      onClick: zoomIn,
      disabled: zoomScale === MAX_ZOOM_LEVEL,
      className: 'canvasContextMenu--topBorder',
    },
    {
      name: strings.getZoomOutText(),
      icon: 'magnifyWithMinus',
      onClick: zoomOut,
      disabled: zoomScale <= MIN_ZOOM_LEVEL,
    },
    {
      name: strings.getZoomResetText(),
      icon: 'empty',
      onClick: resetZoom,
      disabled: zoomScale >= MAX_ZOOM_LEVEL,
      className: 'canvasContextMenu--topBorder',
    },
  ];

  const getPanelTree = (closePopover: ClosePopoverFn) => ({
    id: 0,
    items: [
      {
        name: strings.getRefreshMenuItemLabel(),
        icon: 'refresh',
        onClick: () => {
          doRefresh();
        },
      },
      {
        name: strings.getRefreshSettingsMenuItemLabel(),
        icon: 'empty',
        panel: {
          id: 1,
          title: strings.getRefreshSettingsMenuItemLabel(),
          content: (
            <AutoRefreshControls
              refreshInterval={refreshInterval}
              setRefresh={(val) => setRefresh(val)}
              disableInterval={() => disableInterval()}
            />
          ),
        },
      },
      {
        name: strings.getFullscreenMenuItemLabel(),
        icon: <EuiIcon type="fullScreen" size="m" />,
        className: CONTEXT_MENU_TOP_BORDER_CLASSNAME,
        onClick: () => {
          enterFullscreen();
          closePopover();
        },
      },
      {
        name: autoplayEnabled
          ? strings.getAutoplayOffMenuItemLabel()
          : strings.getAutoplayOnMenuItemLabel(),
        icon: autoplayEnabled ? 'stop' : 'play',
        onClick: () => {
          enableAutoplay(!autoplayEnabled);
          closePopover();
        },
      },
      {
        name: strings.getAutoplaySettingsMenuItemLabel(),
        icon: 'empty',
        panel: {
          id: 2,
          title: strings.getAutoplaySettingsMenuItemLabel(),
          content: (
            <KioskControls
              autoplayInterval={autoplayInterval}
              onSetInterval={setAutoplayInterval}
            />
          ),
        },
      },
      {
        name: isWriteable ? strings.getHideEditModeLabel() : strings.getShowEditModeLabel(),
        icon: <EuiIcon type={isWriteable ? 'eyeClosed' : 'eye'} size="m" />,
        className: CONTEXT_MENU_TOP_BORDER_CLASSNAME,
        onClick: () => {
          toggleWriteable();
          closePopover();
        },
      },
      {
        name: strings.getZoomMenuItemLabel(),
        icon: 'magnifyWithPlus',
        panel: {
          id: 3,
          title: strings.getZoomMenuItemLabel(),
          items: getZoomMenuItems(),
        },
      },
    ],
  });

  return (
    <Popover button={viewControl} panelPaddingSize="none" anchorPosition="downLeft">
      {({ closePopover }: { closePopover: ClosePopoverFn }) => (
        <EuiContextMenu
          initialPanelId={0}
          panels={flattenPanelTree(getPanelTree(closePopover))}
          className="canvasViewMenu"
        />
      )}
    </Popover>
  );
};

ViewMenu.propTypes = {
  isWriteable: PropTypes.bool.isRequired,
  zoomScale: PropTypes.number.isRequired,
  fitToWindow: PropTypes.func.isRequired,
  setZoomScale: PropTypes.func.isRequired,
  zoomIn: PropTypes.func.isRequired,
  zoomOut: PropTypes.func.isRequired,
  resetZoom: PropTypes.func.isRequired,
  toggleWriteable: PropTypes.func.isRequired,
  enterFullscreen: PropTypes.func.isRequired,
  doRefresh: PropTypes.func.isRequired,
  refreshInterval: PropTypes.number.isRequired,
  setRefreshInterval: PropTypes.func.isRequired,
  autoplayEnabled: PropTypes.bool.isRequired,
  autoplayInterval: PropTypes.number.isRequired,
  enableAutoplay: PropTypes.func.isRequired,
  setAutoplayInterval: PropTypes.func.isRequired,
};
