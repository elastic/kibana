/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './empty_placeholder';
export { ToolbarPopoverProps, ToolbarPopover } from './toolbar_popover';
export { LegendSettingsPopover } from './legend_settings_popover';
export { PalettePicker } from './palette_picker';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

export const KBN_HEADER_OFFSET = parseFloat(euiLightVars.euiHeaderHeightCompensation) * 2;
