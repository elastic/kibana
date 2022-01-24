/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SESSION_TABLE,
  SESSION_VIEW_EMPTY_STATE,
  SESSION_TABLE_HEADER,
  SESSION_VIEW_CLOSE_BUTTON,
  PROCESS_TREE,
  PROCESS_TREE_NODE_ALERT,
  SEARCH_BAR,
  SESSION_COMMANDS,
  DETAILS_PANEL,
  DETAILS_PANEL_TOGGLE,
  DETAILS_PANEL_ALERT,
  DETAILS_PANEL_COMMAND,
  DETAILS_PANEL_SESSION,
  DETAILS_PANEL_SERVER,
  getProcessTreeNodeAlertDetailViewRule,
} from '../../screens/session_view';
import {
  loginAndNavigateToHostSessions,
  openSessionView,
} from '../../tasks/hosts/open_session_view';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';

import { cleanKibana } from '../../tasks/common';

const tableHeaders = {
  '@timestamp': '@timestamp',
  'process.user.name': 'process.user.name',
  'event.kind': 'event.kind',
  'process.session.pid': 'process.session.pid',
  'process.args': 'process.args',
};

const TEST_EVENT_ID = 'K6H1AX4BnCZfhnl7tkjN';
const TEST_EVENT_ID_MANY_COMMANDS = 'MsOQb34B4qQiNuYq8lAp';
const LS_TEST_COMMAND = 'ls --color=auto';
const ALERT_TEST_COMMAND = 'vi cmd/config.ini';
const ALERT_NODE_TEST_ID = getProcessTreeNodeAlertDetailViewRule(
  '8a60ee0c7ae7f41d83a07bd80220ec04527464cbf32ea62f9e671c2d43d9d71c'
);
const ALERT_RULE_ID = '422ff92b-837a-49a3-9746-188b7286f56f';
const FIRST_CHILD_COMMAND = '/usr/bin/id';

const SELECTED_COMMAND_COLOR = 'rgb(240, 78, 152)';
const ALERT_COMMAND_COLOR = 'rgba(189, 39, 30, 0.48)';

describe('Session view', () => {
  context('Rendering table empty state', () => {
    before(() => {
      cleanKibana();
    });

    it('shows the empty state', () => {
      loginAndNavigateToHostSessions();
      cy.get(SESSION_VIEW_EMPTY_STATE).should('be.visible');
    });
  });

  context('Rendering with data', () => {
    before(() => {
      cleanKibana();
      esArchiverLoad('session_view');
    });

    beforeEach(() => {
      loginAndNavigateToHostSessions();
    });

    after(() => {
      esArchiverUnload('session_view');
    });

    it('renders the session table', () => {
      // Check all columns expected exist
      Object.keys(tableHeaders).forEach((header: string) => {
        cy.get(SESSION_TABLE_HEADER(header)).should('be.visible');
      });

      openSessionView(TEST_EVENT_ID);

      // Check session view exists and come back to session leader table
      cy.get(PROCESS_TREE).should('be.visible');
      const closeSessionViewButton = cy.get(SESSION_VIEW_CLOSE_BUTTON);
      closeSessionViewButton.should('be.visible');
      closeSessionViewButton.click();

      cy.get(SESSION_TABLE).should('be.visible');
    });

    it('renders the session view', () => {
      openSessionView(TEST_EVENT_ID);

      // Checking Search bar exist
      cy.get(SEARCH_BAR).should('be.visible');

      // Check detail panel and its toggle work correctly
      cy.get(DETAILS_PANEL).should('not.exist');
      // Checking Details panel exist
      cy.get(DETAILS_PANEL_TOGGLE).click();
      cy.get(DETAILS_PANEL).should('be.visible');

      // Only Session, Server Detail exist when no commands selected when detail panel is open
      cy.get(DETAILS_PANEL_ALERT).should('not.exist');
      cy.get(DETAILS_PANEL_COMMAND).should('not.exist');
      cy.get(DETAILS_PANEL_SESSION).should('be.visible');
      cy.get(DETAILS_PANEL_SERVER).should('exist');

      const lsCommandNode = cy.contains(LS_TEST_COMMAND);
      lsCommandNode.should('exist');
      lsCommandNode.click();
      // Checking Command, Session, Server Detail exist for a command without alert
      cy.get(DETAILS_PANEL_ALERT).should('not.exist');
      cy.get(DETAILS_PANEL_COMMAND).should('be.visible');
      cy.get(DETAILS_PANEL_SESSION).should('exist');
      cy.get(DETAILS_PANEL_SERVER).should('exist');

      const viCommand = cy.contains(ALERT_TEST_COMMAND);
      viCommand.should('be.visible');
      viCommand.click();
      // Checking Command, Session, Server, Alert Detail exist
      cy.get(DETAILS_PANEL_ALERT).should('exist');
      cy.get(DETAILS_PANEL_COMMAND).should('be.visible');
      cy.get(DETAILS_PANEL_SESSION).should('exist');
      cy.get(DETAILS_PANEL_SERVER).should('exist');
    });

    it('renders alert details correctly', () => {
      openSessionView(TEST_EVENT_ID);

      cy.get(PROCESS_TREE_NODE_ALERT).first().click();
      cy.get(ALERT_NODE_TEST_ID).first().click();
      cy.location('pathname').should('contain', `app/security/rules/id/${ALERT_RULE_ID}`);
    });

    it('renders child processes correctly', () => {
      openSessionView(TEST_EVENT_ID);

      // Amount of visible commands on the session view should increase when user clicks on the Child Process dropdown button
      cy.get(SESSION_COMMANDS)
        .children()
        .its('length')
        .then((lengthBefore) => {
          const beforeClick = lengthBefore;
          cy.contains('Child processes').click();
          cy.contains(FIRST_CHILD_COMMAND).should('exist');
          cy.get(SESSION_COMMANDS)
            .children()
            .its('length')
            .then((lengthAfter) => {
              // const afterClick = lengthAfter;
              expect(lengthAfter).to.be.greaterThan(beforeClick);
            });
        });

      // Checks the left margin value for each command line, left margin of child would be more to the right compared the parent

      // Get the margin-left value for parent command
      cy.get(SESSION_COMMANDS)
        .eq(1)
        .then((element) => {
          const win = element[0].ownerDocument.defaultView;
          const before = win && win.getComputedStyle(element[0], 'before');
          const contentValue = before && before.getPropertyValue('margin-left');
          const parentCommandLeftMargin = contentValue
            ? parseInt(contentValue.replace('px', ''), 10)
            : 0;
          // Get the margin-left value for child command and compares both of them
          cy.get(SESSION_COMMANDS)
            .eq(2)
            .then((childElement) => {
              const childWin = childElement[0].ownerDocument.defaultView;
              const childBefore = childWin && childWin.getComputedStyle(childElement[0], 'before');
              const childContentValue = childBefore && childBefore.getPropertyValue('margin-left');
              const childCommandLeftMargin = childContentValue
                ? parseInt(childContentValue.replace('px', ''), 10)
                : 0;
              expect(parentCommandLeftMargin).to.be.greaterThan(childCommandLeftMargin);
            });
        });
    });

    // Commented out Root Escalation check until we have better filtering
    /*
    it('root escalation', () => {
      openSessionView(TEST_EVENT_ID);

      // Get the parent div for Root Escalation button and checks if Sudo su and Root Escalation button is with same parent or not
      
      cy.get('span:contains("Root escalation")').its('length').then(lengthBefore =>{
        console.log("LENGHT BEFORE IS " + lengthBefore )
        const beforeClick = lengthBefore;
        const genArr = Array.from({length:beforeClick},(v,k)=>k)
        console.log(genArr)
        cy.wrap(genArr).each((index)=>{

          cy.get('span:contains("Root escalation"):eq('+index+')').parent().parent().parent().contains('sudo').should('exist');
          cy.get('span:contains("Root escalation"):eq('+index+')').parent().parent().parent().contains('su').should('exist');
        })
      })
    });
    */

    it('selected command is highlighted properly', () => {
      openSessionView(TEST_EVENT_ID);
      cy.wait(10000);
      // Click on 1st command and make sure that clicked command is highlighted
      cy.get(SESSION_COMMANDS)
        .eq(0)
        .click()
        .children()
        .eq(0)
        .should('have.css', 'background-color')
        .and('eq', SELECTED_COMMAND_COLOR);
    });

    it('Commands with Alerts is highlighted', () => {
      openSessionView(TEST_EVENT_ID);

      // Gets the number of Alerts we have in a session
      cy.get(PROCESS_TREE_NODE_ALERT)
        .contains('Alerts')
        .its('length')
        .then((lengthBefore) => {
          console.log(`LENGHT BEFORE IS ${lengthBefore}`);
          const beforeClick = lengthBefore;
          const genArr = Array.from({ length: beforeClick }, (v, k) => k);
          console.log(genArr);
          // Checks every alerts in that session is correctly highlighted
          cy.wrap(genArr).each((index) => {
            cy.get(`${PROCESS_TREE_NODE_ALERT}:eq(${index})`)
              .parent()
              .parent()
              .then((childElement) => {
                const childWin = childElement[0].ownerDocument.defaultView;
                const alertHighlight =
                  childWin && childWin.getComputedStyle(childElement[0], 'before');
                const alertHighlightValue =
                  alertHighlight && alertHighlight.getPropertyValue('border-left-color');
                expect(alertHighlightValue).to.equal(ALERT_COMMAND_COLOR);
              });
          });
        });
    });
  });

  context('Rendering with lots of Data', () => {
    before(() => {
      cleanKibana();
      esArchiverLoad('session_view_commands');
    });

    beforeEach(() => {
      loginAndNavigateToHostSessions();
    });

    after(() => {
      // esArchiverUnload('session_view_commands');
    });

    it('Scrolling to hit load more', () => {
      openSessionView(TEST_EVENT_ID_MANY_COMMANDS);

      // Scroll down on main page to allow us to see Load More message
      cy.scrollTo('bottom');

      cy.get(SESSION_COMMANDS);

      cy.get(PROCESS_TREE).scrollTo('bottom');

      // Once user hits the end, Load next bar would be visible while for the the next set of commands to load
      cy.get('button').contains('Load next').should('be.visible');
    });

    it('Load more events via scrolling till the end', () => {
      openSessionView(TEST_EVENT_ID_MANY_COMMANDS);

      // Scroll down on main page to allow us to see Load More message
      cy.scrollTo('bottom');

      cy.get(SESSION_COMMANDS)
        .its('length')
        .then((elementsBefore) => {
          const beforeLoadingMore = elementsBefore;

          cy.get(PROCESS_TREE).scrollTo('bottom');

          cy.wait(3000);

          cy.get(SESSION_COMMANDS)
            .its('length')
            .then((elementsAfter) => {
              expect(elementsAfter).to.be.greaterThan(beforeLoadingMore);
            });
        });
    });

    it('Load more events via clicking on Load next button when visible', () => {
      openSessionView(TEST_EVENT_ID_MANY_COMMANDS);

      // Scroll down on main page to allow us to see Load More message
      cy.scrollTo('bottom');

      cy.get(SESSION_COMMANDS)
        .its('length')
        .then((elementsBefore) => {
          const beforeLoadingMore = elementsBefore;

          cy.get(PROCESS_TREE).scrollTo('bottom');

          // User clicks on the Load Next button to load more commands
          cy.contains('Load next').should('be.visible');
          cy.contains('Load next').click();

          // Allow a couple of seconds to allow session to load more commands
          cy.wait(3000);

          cy.get(SESSION_COMMANDS)
            .its('length')
            .then((elementsAfter) => {
              expect(elementsAfter).to.be.greaterThan(beforeLoadingMore);
            });
        });
    });
  });
});
