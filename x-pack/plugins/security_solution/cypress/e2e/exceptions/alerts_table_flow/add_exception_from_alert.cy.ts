/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  goToClosedAlertsOnRuleDetailsPage,
  goToOpenedAlertsOnRuleDetailsPage,
  openAddEndpointExceptionFromFirstAlert,
} from '../../../tasks/alerts';
import { deleteAlertsAndRules } from '../../../tasks/common';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import { getEndpointRule } from '../../../objects/rule';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { createCustomRuleEnabled } from '../../../tasks/api_calls/rules';
import {
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../../../tasks/create_new_rule';
import {
  esArchiverLoad,
  esArchiverResetKibana,
  esArchiverUnload,
} from '../../../tasks/es_archiver';
import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../urls/navigation';
import {
  addExceptionConditions,
  addExceptionFlyoutItemName,
  selectCloseSingleAlerts,
  submitNewExceptionItem,
} from '../../../tasks/exceptions';
import { ALERTS_COUNT, NUMBER_OF_ALERTS } from '../../../screens/alerts';
import { NO_EXCEPTIONS_EXIST_PROMPT } from '../../../screens/exceptions';
import { goToExceptionsTab, removeException, goToAlertsTab } from '../../../tasks/rule_details';

const EXPECTED_NUMBER_OF_ALERTS = 5;

describe('Add exception from alerts table', () => {
  const NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS = '1 alert';
  const ITEM_NAME = 'Sample Exception List Item';

  before(() => {
    esArchiverResetKibana();
    esArchiverLoad('endpoint');
    login();
    deleteAlertsAndRules();
    createCustomRuleEnabled(getEndpointRule());
  });
  beforeEach(() => {
    //  createCustomRuleEnabled(getBuildingBlockRule());
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    goToRuleDetails();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();
  });
  after(() => {
    esArchiverUnload('endpoint');
  });

  it('Creates an exception item from alert actions overflow menu', () => {
    openAddEndpointExceptionFromFirstAlert();

    // selectOs('windows');

    addExceptionConditions({
      operator: 'is',
      field: 'agent.name',
      values: ['foo'],
    });
    addExceptionFlyoutItemName(ITEM_NAME);
    selectCloseSingleAlerts();
    // selectBulkCloseAlerts();
    submitNewExceptionItem();

    // Alerts table should now be empty from having added exception and closed
    // matching alert
    // cy.get(EMPTY_ALERT_TABLE).should('exist');

    // Closed alert should appear in table
    goToClosedAlertsOnRuleDetailsPage();
    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', `${NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS}`);

    // Remove the exception and load an event that would have matched that exception
    // to show that said exception now starts to show up again
    goToExceptionsTab();

    // when removing exception and again, no more exist, empty screen shows again
    removeException();
    cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('exist');

    // load more docs
    esArchiverLoad('endpoint');

    // now that there are no more exceptions, the docs should match and populate alerts
    goToAlertsTab();
    goToOpenedAlertsOnRuleDetailsPage();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', '2 alerts');
  });
});

// {
// "@timestamp" : "2023-02-15T16:00:31.336Z",
// "file":{
//   "Ext":{
//     "code_signature":{
//       "subject_name":"test",
//       "trusted": true
//       }
//   },
//   "path":{
//       "caseless":"test"
//     },
//     "hash":{
//       "sha256":"test"
//     }
// },
// "host" : {
//   "hostname" : "test.local",
//   "architecture" : "x86_64",
//   "os" : {
//     "platform" : "darwin",
//     "version" : "10.16",
//     "family" : "darwin",
//     "name" : "Mac OS X",
//     "kernel" : "21.3.0",
//     "build" : "21D62",
//     "type" : "macos"
//   },
//   "id" : "44426D67-79AB-547C-7777-440AB8F5DDD2",
//   "ip" : [
//     "fe80::bade:48ff:fe00:1122",
//     "fe81::4ab:9565:1199:be3",
//     "192.168.5.175",
//     "fe80::40d7:d0ff:fe66:f55",
//     "fe81::40d8:d0ff:fe66:f55",
//     "fe82::c2c:6bdf:3307:dce0",
//     "fe83::5069:fcd5:e31c:7059",
//     "fe80::ce81:b2c:bd2c:69e",
//     "fe80::febc:bbc1:c517:827b",
//     "fe80::6d09:bee6:55a5:539d",
//     "fe80::c920:752e:1e0e:edc9",
//     "fe80::a4a:ca38:761f:83e2"
//   ],
//   "mac" : [
//     "ad:df:48:00:11:22",
//     "a6:86:e7:ae:5a:b6",
//     "a9:83:e7:ae:5a:b6",
//     "43:d8:d0:66:0f:55",
//     "42:d8:d0:66:0f:57",
//     "82:70:c7:c2:3c:01",
//     "82:70:c6:c2:4c:00",
//     "82:76:a6:c2:3c:05",
//     "82:70:c6:b2:3c:04",
//     "82:71:a6:c2:3c:01"
//   ],
//   "name" : "siem-kibana"
// },
// "agent" : {
//   "type" : "auditbeat",
//   "version" : "8.1.0",
//   "ephemeral_id" : "f6df090f-656a-4a79-a6a1-0c8671c9752d",
//   "id" : "0ebd469b-c164-4734-00e6-96d018098dc7",
//   "name" : "test.local"
// },
// "event" : {
//   "module" : "endpoint",
//   "dataset" : "process",
//   "kind" : "alert",
//   "category" : [
//     "process"
//   ],
//   "type" : [
//     "start"
//   ],
//   "action" : "process_started",
//   "code":"test"
// },
// "destination": {
//   "port": 80
// },
// "process" : {
//   "start" : "2022-03-04T19:41:32.902Z",
//   "pid" : 30884,
//   "working_directory" : "/Users/test/security_solution",
//   "hash" : {
//     "sha1" : "ae2d46c38fa207efbea5fcecd6294eebbf5af00f"
//   },
//   "parent" : {
//     "pid" : 777
//   },
//   "executable" : "/bin/zsh",
//   "name" : "zsh",
//   "args" : [
//     "-zsh"
//   ],
//   "entity_id" : "q6pltOhTWlQx3BCD",
//   "entry_leader": {
//     "entity_id": "q6pltOhTWlQx3BCD",
//     "name": "fake entry",
//     "pid": 2342342
//   }
// },
// "message" : "Process zsh (PID: 27884) by user test STARTED",
// "user" : {
//   "id" : "505",
//   "group" : {
//     "name" : "staff",
//     "id" : "20"
//   },
//   "effective" : {
//     "id" : "505",
//     "group" : {
//       "id" : "20"
//     }
//   },
//   "saved" : {
//     "id" : "505",
//     "group" : {
//       "id" : "20"
//     }
//   },
//   "name" : "test"
// },
// "service" : {
//   "type" : "system"
// },
// "ecs" : {
//   "version" : "8.0.0"
// }

// }
