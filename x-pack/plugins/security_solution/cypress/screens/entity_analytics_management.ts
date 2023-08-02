/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../helpers/common';

export const PAGE_TITLE = '[data-test-subj="entityAnalyticsManagmentPageTitle"]';

export const HOST_RISK_PREVIEW_TABLE = '[data-test-subj="host-risk-preview-table"]';

export const HOST_RISK_PREVIEW_TABLE_ROWS = '[data-test-subj="host-risk-preview-table"] tbody tr';

export const USER_RISK_PREVIEW_TABLE = '[data-test-subj="user-risk-preview-table"]';

export const USER_RISK_PREVIEW_TABLE_ROWS = '[data-test-subj="user-risk-preview-table"] tbody tr';

export const RISK_PREVIEW_ERROR = '[data-test-subj="risk-preview-error"]';

export const RISK_PREVIEW_ERROR_BUTTON = '[data-test-subj="risk-preview-error-button"]';

export const LOCAL_QUERY_BAR_SELECTOR = getDataTestSubjectSelector('risk-score-preview-search-bar');

export const RISK_SCORE_ERROR_PANEL = '[data-test-subj="riskScoreErrorPanel"]';

export const RISK_SCORE_UPDATE_CANCEL = '[data-test-subj="riskScoreUpdateCancel"]';

export const RISK_SCORE_UPDATE_CONFIRM = '[data-test-subj="riskScoreUpdateConfirm"]';

export const RISK_SCORE_UDATE_BUTTON = '[data-test-subj="riskScoreUpdateButton"]';

export const RISK_SCORE_STATUS = '[data-test-subj="riskScoreStatus"]';

export const RISK_SCORE_SWITCH = '[data-test-subj="riskScoreSwitch"]';
