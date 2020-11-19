/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactWrapper } from 'enzyme';

export const getCanvas = (wrapper: ReactWrapper) => wrapper.find('Canvas > CanvasComponent');

export const getFooter = (wrapper: ReactWrapper) => wrapper.find('Footer > FooterComponent');

export const getScrubber = (wrapper: ReactWrapper) => wrapper.find('Scrubber > ScrubberComponent');

export const getScrubberSlideContainer = (wrapper: ReactWrapper) =>
  getScrubber(wrapper).find('.slideContainer');

export const getToolbarPanel = (wrapper: ReactWrapper) =>
  wrapper.find('ToolbarSettings > ToolbarSettingsComponent');

export const getToolbarCheckbox = (wrapper: ReactWrapper) =>
  getToolbarPanel(wrapper).find('EuiSwitch').find('button');

export const getAutoplayPanel = (wrapper: ReactWrapper) =>
  wrapper.find('AutoplaySettings > AutoplaySettingsComponent');

export const getAutoplayCheckbox = (wrapper: ReactWrapper) =>
  getAutoplayPanel(wrapper).find('EuiSwitch').find('button');

export const getAutoplayTextField = (wrapper: ReactWrapper) =>
  getAutoplayPanel(wrapper).find('EuiFieldText').find('input[type="text"]');

export const getAutoplaySubmit = (wrapper: ReactWrapper) =>
  getAutoplayPanel(wrapper).find('EuiButton');

export const getSettingsPanel = (wrapper: ReactWrapper) =>
  wrapper.find('Settings > SettingsComponent');

export const getSettingsTrigger = (wrapper: ReactWrapper) =>
  getSettingsPanel(wrapper).find('EuiButtonIcon');

export const getPopover = (wrapper: ReactWrapper) => wrapper.find('EuiPopover');

export const getPortal = (wrapper: ReactWrapper) => wrapper.find('EuiPortal');

export const getContextMenuItems = (wrapper: ReactWrapper) => wrapper.find('EuiContextMenuItem');

export const getPageControlsCenter = (wrapper: ReactWrapper) =>
  wrapper.find('EuiButtonEmpty[data-test-subj="pageControlsCurrentPage"]');

export const getPageControlsPrevious = (wrapper: ReactWrapper) =>
  wrapper.find('EuiButtonIcon[data-test-subj="pageControlsPrevPage"]');

export const getPageControlsNext = (wrapper: ReactWrapper) =>
  wrapper.find('EuiButtonIcon[data-test-subj="pageControlsNextPage"]');

export const getRenderedElement = (wrapper: ReactWrapper) => wrapper.find('.render');
