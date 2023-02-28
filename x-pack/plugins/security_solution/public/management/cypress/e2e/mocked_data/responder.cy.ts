/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexedCase } from '../../../../../common/endpoint/data_loaders/index_case';
import {
  closeResponder,
  closeResponderActionLogFlyout,
  openResponderActionLogDatePickerQuickMenu,
  openResponderActionLogFlyout,
} from '../../screens/responder';
import { login } from '../../tasks/login';
import { DATE_RANGE_OPTION_TO_TEST_SUBJ_MAP } from '../../../../../../../test/security_solution_ftr/page_objects/helpers/super_date_picker';
import { indexNewCase } from '../../tasks/index_new_case';

describe('When accessing Endpoint Response Console', () => {
  const performResponderSanityChecks = () => {
    // Show the Action log
    openResponderActionLogFlyout();

    // Ensure the popover in the action log date quick select picker is accessible
    // (this is especially important for when Responder is displayed from a Timeline)
    openResponderActionLogDatePickerQuickMenu();
    cy.getByTestSubj(DATE_RANGE_OPTION_TO_TEST_SUBJ_MAP['Last 1 year']);
    closeResponderActionLogFlyout();

    // Close responder
    closeResponder();
  };

  before(() => {
    login();
  });

  describe('from Cases', () => {
    let caseData: IndexedCase;

    before(() => {
      indexNewCase().then((indexCase) => {
        caseData = indexCase;
      });

      // TODO: create an alert

      // TODO: Add alert to the case

      // TODO: go to the case

      // TODO: open alert in case
    });

    after(() => {
      if (caseData) {
        caseData.cleanup();
      }
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
