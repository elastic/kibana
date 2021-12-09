/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const PROCESS_TREE = '[data-test-subj="sessionViewProcessTree"]';
export const PROCESS_TREE_NODE = '[data-test-subj="processTreeNode"]';
export const PROCESS_TREE_NODE_ALERT = '[data-test-subj="processTreeNodeAlertButton"]';
export const SEARCH_BAR = '[data-test-subj="sessionViewProcessEventsSearch"]';

export const DETAILS_PANEL = '[data-test-subj="sessionViewDetailPanel"]';
export const DETAILS_PANEL_TOGGLE = '[data-test-subj="sessionViewDetailPanelToggle"]';
export const DETAILS_PANEL_ALERT = '[data-test-subj="sessionViewDetailPanelAlertDetail"]';
export const DETAILS_PANEL_COMMAND = '[data-test-subj="sessionViewDetailPanelCommandDetail"]';
export const DETAILS_PANEL_SESSION = '[data-test-subj="sessionViewDetailPanelSessionDetail"]';
export const DETAILS_PANEL_SERVER = '[data-test-subj="sessionViewDetailPanelServerDetail"]';

export const getProcessTreeNodeAlertDetailViewRule = (alertUUID: string) =>
  `[data-test-subj="sessionViewAlertDetailViewRule-${alertUUID}"]`;
