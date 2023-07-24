/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';
import { VISUALIZE_TAB_SESSION_VIEW_BUTTON_TEST_ID } from '../../../public/flyout/left/tabs/test_ids';
import { SESSION_VIEW_ERROR_TEST_ID } from '../../../public/flyout/left/components/test_ids';

export const DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_SESSION_VIEW_BUTTON = getDataTestSubjectSelector(
  VISUALIZE_TAB_SESSION_VIEW_BUTTON_TEST_ID
);
export const DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_SESSION_VIEW_ERROR = getDataTestSubjectSelector(
  SESSION_VIEW_ERROR_TEST_ID
);
