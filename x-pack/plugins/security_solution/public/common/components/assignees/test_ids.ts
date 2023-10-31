/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const PREFIX = 'securitySolutionAssignees';

/* Apply Panel */
export const ASSIGNEES_APPLY_PANEL_TEST_ID = `${PREFIX}ApplyPanel`;
export const ASSIGNEES_APPLY_BUTTON_TEST_ID = `${PREFIX}ApplyButton`;

/* Avatars */
export const ASSIGNEES_AVATAR_ITEM_TEST_ID = (userName: string) => `${PREFIX}Avatar-${userName}`;
export const ASSIGNEES_AVATARS_PANEL_TEST_ID = `${PREFIX}AvatarsPanel`;
export const ASSIGNEES_AVATARS_COUNT_BADGE_TEST_ID = `${PREFIX}AvatarsCountBadge`;
export const ASSIGNEES_AVATARS_LOADING_TEST_ID = `${PREFIX}AvatarsLoading`;
