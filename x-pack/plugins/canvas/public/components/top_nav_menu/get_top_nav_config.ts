/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentStrings as strings } from '../../../i18n';

export type TopNavMenuAction = (anchorElement?: HTMLElement) => void;

export const TopNavIds = {
  EDIT: 'edit',
  SHARE: 'share',
  OPTIONS: 'options',
};

/**
 * @param actions - A mapping of TopNavIds to an action function that should run when the
 * corresponding top nav is clicked.
 * @param hideWriteControls if true, does not include any controls that allow editing or creating objects.
 * @return an array of objects for a top nav configuration, based on the mode.
 */
export function getTopNavConfig(actions: { [key: string]: TopNavMenuAction }) {
  return [
    getOptionsConfig(actions[TopNavIds.OPTIONS]),
    getShareConfig(actions[TopNavIds.SHARE]),
    getEditConfig(actions[TopNavIds.EDIT]),
  ];
}

/**
 * @returns {kbnTopNavConfig}
 */
function getEditConfig(action: TopNavMenuAction) {
  return {
    id: 'edit',
    label: strings.WorkpadHeaderEditMenu.getEditMenuButtonLabel(),
    description: strings.WorkpadHeaderEditMenu.getEditMenuLabel(),
    testId: 'canvasEditMenu',
    run: action,
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getOptionsConfig(action: TopNavMenuAction) {
  return {
    id: 'options',
    label: strings.WorkpadHeaderOptionsMenu.getOptionsMenuButtonLabel(),
    description: strings.WorkpadHeaderOptionsMenu.getOptionsMenuLabel(),
    testId: 'canvasOptionsMenu',
    run: action,
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getShareConfig(action: TopNavMenuAction) {
  return {
    id: 'share',
    label: strings.WorkpadHeaderShareMenu.getShareMenuButtonLabel(),
    description: strings.WorkpadHeaderShareMenu.getShareWorkpadMessage(),
    testId: 'canvasShareMenu',
    run: action,
  };
}
