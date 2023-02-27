/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  closeResponder,
  ensureResponderActionLogFlyoutClosed,
  openResponderActionLogDatePickerQuickMenu,
  openResponderActionLogFlyout,
} from '../../screens/responder';
import { login } from '../../tasks/login';
import { DATE_RANGE_OPTION_TO_TEST_SUBJ_MAP } from '../../../../../../../test/security_solution_ftr/page_objects/helpers/super_date_picker';

describe('When accessing Endpoint Response Console', () => {
  const performResponderSanityChecks = () => {
    // Show the Action log
    openResponderActionLogFlyout();

    // Ensure the popover in the action log date quick select picker is accessible
    // (this is especially important for when Responder is displayed from a Timeline)
    openResponderActionLogDatePickerQuickMenu();
    cy.getByTestSubj(DATE_RANGE_OPTION_TO_TEST_SUBJ_MAP['Last 1 year']);
    ensureResponderActionLogFlyoutClosed();

    // Close responder
    closeResponder();
  };

  before(() => {
    login();
  });

  describe('from Cases', () => {
    before(() => {
      // TODO: Create new case
      // TODO: Add an alert to the case
      // TODO: go to the case
      // TODO: open alert in case
    });

    after(() => {
      // TODO: cleanup
    });

    it('should display responder option in take action menu', () => {
      // TODO
    });

    it('should display Responder response action interface', () => {
      // FIXME: Open console

      performResponderSanityChecks();
    });
  });
});
