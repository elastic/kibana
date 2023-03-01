/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnwrapPromise } from '@kbn/infra-plugin/common/utility_types';
import { addAlertsToCase } from '../../tasks/add_alerts_to_case';
import type { IndexedEndpointRuleAlerts } from '../../../../../common/endpoint/data_loaders/index_endpoint_rule_alerts';
import { indexEndpointRuleAlerts } from '../../tasks/index_endpoint_rule_alerts';
import { APP_CASES_PATH } from '../../../../../common/constants';
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
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';

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
    let endpointData: UnwrapPromise<ReturnType<typeof indexEndpointHosts>>;
    let caseData: IndexedCase;
    let alertData: IndexedEndpointRuleAlerts;
    let caseUrlPath: string;

    before(() => {
      indexNewCase().then((indexCase) => {
        caseData = indexCase;
        caseUrlPath = `${APP_CASES_PATH}/${indexCase.data.id}`;
      });

      indexEndpointHosts()
        .then((indexEndpoints) => {
          endpointData = indexEndpoints;
        })
        .then(() => {
          return indexEndpointRuleAlerts({
            endpointAgentId: endpointData.data.hosts[0].agent.id,
          }).then((indexedAlert) => {
            alertData = indexedAlert;
          });
        })
        .then(() => {
          return addAlertsToCase({ caseId: caseData.data.id, alertIds: [alertData.alerts[0]._id] });
        });
    });

    after(() => {
      if (caseData) {
        caseData.cleanup();
        // @ts-expect-error ignore setting to undefined
        caseData = undefined;
      }

      if (endpointData) {
        endpointData.cleanup();
        // @ts-expect-error ignore setting to undefined
        endpointData = undefined;
      }

      if (alertData) {
        alertData.cleanup();
        // @ts-expect-error ignore setting to undefined
        alertData = undefined;
      }
    });

    beforeEach(() => {
      login();
    });

    it('should display responder option in take action menu', () => {
      cy.visit(caseUrlPath);
    });

    it('should display Responder response action interface', () => {
      cy.visit(caseUrlPath);

      // TODO: open alert in case

      // FIXME: Open console

      // FIXME: perform checks
      // performResponderSanityChecks();
    });
  });
});
