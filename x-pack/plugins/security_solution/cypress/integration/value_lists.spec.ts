/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import { DETECTIONS_URL } from '../urls/navigation';
import {
  waitForAlertsPanelToBeLoaded,
  waitForAlertsIndexToBeCreated,
  goToManageAlertsDetectionRules,
} from '../tasks/alerts';
import {
  waitForListsIndexToBeCreated,
  waitForValueListsModalToBeLoaded,
  openValueListsModal,
  selectValueListsFile,
  uploadValueList,
} from '../tasks/lists';
import { VALUE_LISTS_TABLE, VALUE_LISTS_ROW } from '../screens/lists';

describe('value lists', () => {
  describe('management modal', () => {
    it('creates a keyword list from an uploaded file', () => {
      loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
      waitForAlertsPanelToBeLoaded();
      waitForAlertsIndexToBeCreated();
      waitForListsIndexToBeCreated();
      goToManageAlertsDetectionRules();
      waitForValueListsModalToBeLoaded();
      openValueListsModal();
      selectValueListsFile();
      uploadValueList();

      cy.get(VALUE_LISTS_TABLE)
        .find(VALUE_LISTS_ROW)
        .should(($row) => {
          expect($row.text()).to.contain('value_list.txt');
        });
    });
  });
});
