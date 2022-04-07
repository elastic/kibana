/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DATE_PICKER_APPLY_BUTTON_TIMELINE,
  DATE_PICKER_END_DATE_POPOVER_BUTTON,
  DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE,
  DATE_PICKER_START_DATE_POPOVER_BUTTON,
  DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE,
} from '../../screens/date_picker';
import { HOSTS_NAMES } from '../../screens/hosts/all_hosts';
import { ANOMALIES_TAB } from '../../screens/hosts/main';
import { BREADCRUMBS, HOSTS, KQL_INPUT, NETWORK } from '../../screens/security_header';
import { TIMELINE_TITLE } from '../../screens/timeline';

import { login, visit, visitWithoutDateRange } from '../../tasks/login';
import {
  setStartDate,
  setEndDate,
  updateDates,
  setTimelineStartDate,
  setTimelineEndDate,
  updateTimelineDates,
} from '../../tasks/date_picker';
import { openFirstHostDetails, waitForAllHostsToBeLoaded } from '../../tasks/hosts/all_hosts';
import { openAllHosts } from '../../tasks/hosts/main';

import { waitForIpsTableToBeLoaded } from '../../tasks/network/flows';
import { clearSearchBar, kqlSearch, navigateFromHeaderTo } from '../../tasks/security_header';
import { openTimelineUsingToggle } from '../../tasks/security_main';
import { addNameToTimeline, closeTimeline, populateTimeline } from '../../tasks/timeline';

import { HOSTS_URL } from '../../urls/navigation';
import { ABSOLUTE_DATE_RANGE } from '../../urls/state';

import { getTimeline } from '../../objects/timeline';
import { TIMELINE } from '../../screens/create_new_case';

const ABSOLUTE_DATE = {
  endTime: 'Aug 1, 2019 @ 20:33:29.186',
  endTimeTimeline: '2019-08-02T21:03:29.186Z',
  endTimeTimelineFormatted: 'Aug 2, 2019 @ 21:03:29.186',
  newEndTimeTyped: 'Aug 01, 2019 @ 15:03:29.186',
  newStartTimeTyped: 'Aug 01, 2019 @ 14:33:29.186',
  startTime: 'Aug 1, 2019 @ 20:03:29.186',
  startTimeTimeline: '2019-08-02T20:03:29.186Z',
  startTimeTimelineFormatted: 'Aug 2, 2019 @ 20:03:29.186',
  firefoxEndTimeTyped: '2019-08-01T15:03:29',
  firefoxStartTimeTyped: '2019-08-01T14:33:29',
};

describe('url state', () => {
  before(() => {
    login();
  });

  it('sets the global start and end dates from the url', () => {
    visitWithoutDateRange(ABSOLUTE_DATE_RANGE.url);
    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.startTime
    );
    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON).should('have.attr', 'title', ABSOLUTE_DATE.endTime);
  });

  it('sets the url state when start and end date are set', () => {
    visitWithoutDateRange(ABSOLUTE_DATE_RANGE.url);
    setStartDate(ABSOLUTE_DATE.newStartTimeTyped);
    updateDates();
    waitForIpsTableToBeLoaded();
    setEndDate(ABSOLUTE_DATE.newEndTimeTyped);
    updateDates();

    let startDate: string;
    let endDate: string;

    if (Cypress.browser.name === 'firefox') {
      startDate = new Date(ABSOLUTE_DATE.firefoxStartTimeTyped).toISOString().replace('000', '186');
      endDate = new Date(ABSOLUTE_DATE.firefoxEndTimeTyped).toISOString().replace('000', '186');
    } else {
      startDate = new Date(ABSOLUTE_DATE.newStartTimeTyped).toISOString();
      endDate = new Date(ABSOLUTE_DATE.newEndTimeTyped).toISOString();
    }

    cy.url().should(
      'include',
      `(global:(linkTo:!(timeline),timerange:(from:%27${startDate}%27,kind:absolute,to:%27${endDate}%27))`
    );
  });

  it('sets the timeline start and end dates from the url when locked to global time', () => {
    visitWithoutDateRange(ABSOLUTE_DATE_RANGE.url);
    openTimelineUsingToggle();

    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.startTime
    );
    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.endTime
    );
  });

  it('sets the timeline start and end dates independently of the global start and end dates when times are unlocked', () => {
    visitWithoutDateRange(ABSOLUTE_DATE_RANGE.urlUnlinked);
    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.startTime
    );
    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON).should('have.attr', 'title', ABSOLUTE_DATE.endTime);

    openTimelineUsingToggle();

    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.startTimeTimelineFormatted
    );
    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.endTimeTimelineFormatted
    );
  });

  it('sets the url state when timeline/global date pickers are unlinked and timeline start and end date are set', () => {
    visitWithoutDateRange(ABSOLUTE_DATE_RANGE.urlUnlinked);
    openTimelineUsingToggle();
    setTimelineStartDate(ABSOLUTE_DATE.newStartTimeTyped);
    updateTimelineDates();
    setTimelineEndDate(ABSOLUTE_DATE.newEndTimeTyped);
    updateTimelineDates();

    let startDate: string;
    let endDate: string;

    if (Cypress.browser.name === 'firefox') {
      startDate = new Date(ABSOLUTE_DATE.firefoxStartTimeTyped).toISOString().replace('000', '186');
      endDate = new Date(ABSOLUTE_DATE.firefoxEndTimeTyped).toISOString().replace('000', '186');
    } else {
      startDate = new Date(ABSOLUTE_DATE.newStartTimeTyped).toISOString();
      endDate = new Date(ABSOLUTE_DATE.newEndTimeTyped).toISOString();
    }

    cy.url().should(
      'include',
      `timeline:(linkTo:!(),timerange:(from:%27${startDate}%27,kind:absolute,to:%27${endDate}%27))`
    );
  });

  it('sets kql on network page', () => {
    visitWithoutDateRange(ABSOLUTE_DATE_RANGE.urlKqlNetworkNetwork);
    cy.get(KQL_INPUT).should('have.text', 'source.ip: "10.142.0.9"');
  });

  it('sets kql on hosts page', () => {
    visitWithoutDateRange(ABSOLUTE_DATE_RANGE.urlKqlHostsHosts);
    cy.get(KQL_INPUT).should('have.text', 'source.ip: "10.142.0.9"');
  });

  it('sets the url state when kql is set', () => {
    visitWithoutDateRange(ABSOLUTE_DATE_RANGE.url);
    kqlSearch('source.ip: "10.142.0.9" {enter}');

    cy.url().should(
      'include',
      `query=(language:kuery,query:%27source.ip:%20%2210.142.0.9%22%20%27)`
    );
  });

  it('sets the url state when kql is set and check if href reflect this change', () => {
    visitWithoutDateRange(ABSOLUTE_DATE_RANGE.url);
    kqlSearch('source.ip: "10.142.0.9" {enter}');
    navigateFromHeaderTo(HOSTS);
    cy.get(NETWORK).should(
      'have.attr',
      'href',
      `/app/security/network?query=(language:kuery,query:'source.ip:%20%2210.142.0.9%22%20')&sourcerer=(default:(id:security-solution-default,selectedPatterns:!('auditbeat-*')))&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-08-01T20:03:29.186Z',kind:absolute,to:'2019-08-01T20:33:29.186Z')),timeline:(linkTo:!(global),timerange:(from:'2019-08-01T20:03:29.186Z',kind:absolute,to:'2019-08-01T20:33:29.186Z')))`
    );
  });

  it('sets KQL in host page and detail page and check if href match on breadcrumb, tabs and subTabs', () => {
    visitWithoutDateRange(ABSOLUTE_DATE_RANGE.urlHostNew);
    kqlSearch('host.name: "siem-kibana" {enter}');
    openAllHosts();
    waitForAllHostsToBeLoaded();

    cy.get(HOSTS).should(
      'have.attr',
      'href',
      `/app/security/hosts?query=(language:kuery,query:'host.name:%20%22siem-kibana%22%20')&sourcerer=(default:(id:security-solution-default,selectedPatterns:!('auditbeat-*')))&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-08-01T20:03:29.186Z',kind:absolute,to:'2023-01-01T21:33:29.186Z')),timeline:(linkTo:!(global),timerange:(from:'2019-08-01T20:03:29.186Z',kind:absolute,to:'2023-01-01T21:33:29.186Z')))`
    );
    cy.get(NETWORK).should(
      'have.attr',
      'href',
      `/app/security/network?query=(language:kuery,query:'host.name:%20%22siem-kibana%22%20')&sourcerer=(default:(id:security-solution-default,selectedPatterns:!('auditbeat-*')))&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-08-01T20:03:29.186Z',kind:absolute,to:'2023-01-01T21:33:29.186Z')),timeline:(linkTo:!(global),timerange:(from:'2019-08-01T20:03:29.186Z',kind:absolute,to:'2023-01-01T21:33:29.186Z')))`
    );
    cy.get(HOSTS_NAMES).first().should('have.text', 'siem-kibana');

    openFirstHostDetails();
    clearSearchBar();
    kqlSearch('agent.type: "auditbeat" {enter}');

    cy.get(ANOMALIES_TAB).should(
      'have.attr',
      'href',
      "/app/security/hosts/siem-kibana/anomalies?sourcerer=(default:(id:security-solution-default,selectedPatterns:!('auditbeat-*')))&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-08-01T20:03:29.186Z',kind:absolute,to:'2023-01-01T21:33:29.186Z')),timeline:(linkTo:!(global),timerange:(from:'2019-08-01T20:03:29.186Z',kind:absolute,to:'2023-01-01T21:33:29.186Z')))&query=(language:kuery,query:'agent.type:%20%22auditbeat%22%20')"
    );
    cy.get(BREADCRUMBS)
      .eq(1)
      .should(
        'have.attr',
        'href',
        `/app/security/hosts?query=(language:kuery,query:'agent.type:%20%22auditbeat%22%20')&sourcerer=(default:(id:security-solution-default,selectedPatterns:!('auditbeat-*')))&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-08-01T20:03:29.186Z',kind:absolute,to:'2023-01-01T21:33:29.186Z')),timeline:(linkTo:!(global),timerange:(from:'2019-08-01T20:03:29.186Z',kind:absolute,to:'2023-01-01T21:33:29.186Z')))`
      );
    cy.get(BREADCRUMBS)
      .eq(2)
      .should(
        'have.attr',
        'href',
        `/app/security/hosts/siem-kibana?query=(language:kuery,query:'agent.type:%20%22auditbeat%22%20')&sourcerer=(default:(id:security-solution-default,selectedPatterns:!('auditbeat-*')))&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-08-01T20:03:29.186Z',kind:absolute,to:'2023-01-01T21:33:29.186Z')),timeline:(linkTo:!(global),timerange:(from:'2019-08-01T20:03:29.186Z',kind:absolute,to:'2023-01-01T21:33:29.186Z')))`
      );
  });

  it('Do not clears kql when navigating to a new page', () => {
    visitWithoutDateRange(ABSOLUTE_DATE_RANGE.urlKqlHostsHosts);
    navigateFromHeaderTo(NETWORK);
    cy.get(KQL_INPUT).should('have.text', 'source.ip: "10.142.0.9"');
  });

  it('sets and reads the url state for timeline by id', () => {
    visit(HOSTS_URL);
    openTimelineUsingToggle();
    populateTimeline();

    cy.intercept('PATCH', '/api/timeline').as('timeline');

    addNameToTimeline(getTimeline().title);

    cy.wait('@timeline').then(({ response }) => {
      closeTimeline();
      cy.wrap(response?.statusCode).should('eql', 200);
      const timelineId = response?.body.data.persistTimeline.timeline.savedObjectId;
      cy.visit('/app/home');
      cy.visit(`/app/security/timelines?timeline=(id:'${timelineId}',isOpen:!t)`);
      cy.get(DATE_PICKER_APPLY_BUTTON_TIMELINE).should('exist');
      cy.get(DATE_PICKER_APPLY_BUTTON_TIMELINE).should('not.have.text', 'Updating');
      cy.get(TIMELINE).should('be.visible');
      cy.get(TIMELINE_TITLE).should('be.visible');
      cy.get(TIMELINE_TITLE).should('have.text', getTimeline().title);
    });
  });
});
