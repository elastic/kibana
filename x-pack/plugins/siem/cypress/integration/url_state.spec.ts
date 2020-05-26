/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DATE_PICKER_APPLY_BUTTON_TIMELINE,
  DATE_PICKER_END_DATE_POPOVER_BUTTON,
  DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE,
  DATE_PICKER_START_DATE_POPOVER_BUTTON,
  DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE,
} from '../screens/date_picker';
import { HOSTS_NAMES } from '../screens/hosts/all_hosts';
import { ANOMALIES_TAB } from '../screens/hosts/main';
import { BREADCRUMBS, HOSTS, KQL_INPUT, NETWORK } from '../screens/siem_header';
import { SERVER_SIDE_EVENT_COUNT, TIMELINE_TITLE } from '../screens/timeline';

import { loginAndWaitForPage, loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import {
  setStartDate,
  setEndDate,
  updateDates,
  setTimelineStartDate,
  setTimelineEndDate,
  updateTimelineDates,
} from '../tasks/date_picker';
import { openFirstHostDetails, waitForAllHostsToBeLoaded } from '../tasks/hosts/all_hosts';
import { openAllHosts } from '../tasks/hosts/main';

import { waitForIpsTableToBeLoaded } from '../tasks/network/flows';
import { clearSearchBar, kqlSearch, navigateFromHeaderTo } from '../tasks/siem_header';
import { openTimeline } from '../tasks/siem_main';
import {
  addDescriptionToTimeline,
  addNameToTimeline,
  closeTimeline,
  executeTimelineKQL,
} from '../tasks/timeline';

import { HOSTS_PAGE } from '../urls/navigation';
import { ABSOLUTE_DATE_RANGE } from '../urls/state';

const ABSOLUTE_DATE = {
  endTime: '1564691609186',
  endTimeFormat: '2019-08-01T20:33:29.186Z',
  endTimeTimeline: '1564779809186',
  endTimeTimelineFormat: '2019-08-02T21:03:29.186Z',
  endTimeTimelineTyped: 'Aug 02, 2019 @ 21:03:29.186',
  endTimeTyped: 'Aug 01, 2019 @ 14:33:29.186',
  newEndTime: '1564693409186',
  newEndTimeFormat: '2019-08-01T21:03:29.186Z',
  newEndTimeTyped: 'Aug 01, 2019 @ 15:03:29.186',
  newStartTime: '1564691609186',
  newStartTimeFormat: '2019-08-01T20:33:29.186Z',
  newStartTimeTyped: 'Aug 01, 2019 @ 14:33:29.186',
  startTime: '1564689809186',
  startTimeFormat: '2019-08-01T20:03:29.186Z',
  startTimeTimeline: '1564776209186',
  startTimeTimelineFormat: '2019-08-02T20:03:29.186Z',
  startTimeTimelineTyped: 'Aug 02, 2019 @ 14:03:29.186',
  startTimeTyped: 'Aug 01, 2019 @ 14:03:29.186',
};

describe('url state', () => {
  it('sets the global start and end dates from the url', () => {
    loginAndWaitForPageWithoutDateRange(ABSOLUTE_DATE_RANGE.url);
    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.startTimeFormat
    );
    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.endTimeFormat
    );
  });

  it('sets the url state when start and end date are set', () => {
    loginAndWaitForPageWithoutDateRange(ABSOLUTE_DATE_RANGE.url);
    setStartDate(ABSOLUTE_DATE.newStartTimeTyped);
    updateDates();
    waitForIpsTableToBeLoaded();
    setEndDate(ABSOLUTE_DATE.newEndTimeTyped);
    updateDates();

    cy.url().should(
      'include',
      `(global:(linkTo:!(timeline),timerange:(from:${new Date(
        ABSOLUTE_DATE.newStartTimeTyped
      ).valueOf()},kind:absolute,to:${new Date(ABSOLUTE_DATE.newEndTimeTyped).valueOf()}))`
    );
  });

  it('sets the timeline start and end dates from the url when locked to global time', () => {
    loginAndWaitForPageWithoutDateRange(ABSOLUTE_DATE_RANGE.url);
    openTimeline();

    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.startTimeFormat
    );
    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.endTimeFormat
    );
  });

  it('sets the timeline start and end dates independently of the global start and end dates when times are unlocked', () => {
    loginAndWaitForPageWithoutDateRange(ABSOLUTE_DATE_RANGE.urlUnlinked);
    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.startTimeFormat
    );
    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.endTimeFormat
    );

    openTimeline();

    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.startTimeTimelineFormat
    );
    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.endTimeTimelineFormat
    );
  });

  it('sets the url state when timeline/global date pickers are unlinked and timeline start and end date are set', () => {
    loginAndWaitForPageWithoutDateRange(ABSOLUTE_DATE_RANGE.urlUnlinked);
    openTimeline();
    setTimelineStartDate(ABSOLUTE_DATE.newStartTimeTyped);
    updateTimelineDates();
    setTimelineEndDate(ABSOLUTE_DATE.newEndTimeTyped);
    updateTimelineDates();

    cy.url().should(
      'include',
      `timeline:(linkTo:!(),timerange:(from:${new Date(
        ABSOLUTE_DATE.newStartTimeTyped
      ).valueOf()},kind:absolute,to:${new Date(ABSOLUTE_DATE.newEndTimeTyped).valueOf()}))`
    );
  });

  it('sets kql on network page', () => {
    loginAndWaitForPageWithoutDateRange(ABSOLUTE_DATE_RANGE.urlKqlNetworkNetwork);
    cy.get(KQL_INPUT).should('have.attr', 'value', 'source.ip: "10.142.0.9"');
  });

  it('sets kql on hosts page', () => {
    loginAndWaitForPageWithoutDateRange(ABSOLUTE_DATE_RANGE.urlKqlHostsHosts);
    cy.get(KQL_INPUT).should('have.attr', 'value', 'source.ip: "10.142.0.9"');
  });

  it('sets the url state when kql is set', () => {
    loginAndWaitForPageWithoutDateRange(ABSOLUTE_DATE_RANGE.url);
    kqlSearch('source.ip: "10.142.0.9" {enter}');

    cy.url().should('include', `query=(language:kuery,query:'source.ip:%20%2210.142.0.9%22%20')`);
  });

  it('sets the url state when kql is set and check if href reflect this change', () => {
    loginAndWaitForPageWithoutDateRange(ABSOLUTE_DATE_RANGE.url);
    kqlSearch('source.ip: "10.142.0.9" {enter}');
    navigateFromHeaderTo(HOSTS);

    cy.get(NETWORK).should(
      'have.attr',
      'href',
      "#/link-to/network?query=(language:kuery,query:'source.ip:%20%2210.142.0.9%22%20')&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))"
    );
  });

  it('sets KQL in host page and detail page and check if href match on breadcrumb, tabs and subTabs', () => {
    loginAndWaitForPageWithoutDateRange(ABSOLUTE_DATE_RANGE.urlHostNew);
    kqlSearch('host.name: "siem-kibana" {enter}');
    openAllHosts();
    waitForAllHostsToBeLoaded();

    cy.get(HOSTS).should(
      'have.attr',
      'href',
      "#/link-to/hosts?query=(language:kuery,query:'host.name:%20%22siem-kibana%22%20')&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1577914409186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1577914409186)))"
    );
    cy.get(NETWORK).should(
      'have.attr',
      'href',
      "#/link-to/network?query=(language:kuery,query:'host.name:%20%22siem-kibana%22%20')&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1577914409186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1577914409186)))"
    );
    cy.get(HOSTS_NAMES).first().invoke('text').should('eq', 'siem-kibana');

    openFirstHostDetails();
    clearSearchBar();
    kqlSearch('agent.type: "auditbeat" {enter}');

    cy.get(ANOMALIES_TAB).should(
      'have.attr',
      'href',
      "#/hosts/siem-kibana/anomalies?query=(language:kuery,query:'agent.type:%20%22auditbeat%22%20')&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1577914409186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1577914409186)))"
    );
    cy.get(BREADCRUMBS)
      .eq(1)
      .should(
        'have.attr',
        'href',
        "#/link-to/hosts?query=(language:kuery,query:'agent.type:%20%22auditbeat%22%20')&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1577914409186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1577914409186)))"
      );
    cy.get(BREADCRUMBS)
      .eq(2)
      .should(
        'have.attr',
        'href',
        "#/link-to/hosts/siem-kibana?query=(language:kuery,query:'agent.type:%20%22auditbeat%22%20')&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1577914409186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1577914409186)))"
      );
  });

  it('Do not clears kql when navigating to a new page', () => {
    loginAndWaitForPageWithoutDateRange(ABSOLUTE_DATE_RANGE.urlKqlHostsHosts);
    navigateFromHeaderTo(NETWORK);

    cy.get(KQL_INPUT).should('have.attr', 'value', 'source.ip: "10.142.0.9"');
  });

  it('sets and reads the url state for timeline by id', () => {
    loginAndWaitForPage(HOSTS_PAGE);
    openTimeline();
    executeTimelineKQL('host.name: *');

    cy.get(SERVER_SIDE_EVENT_COUNT)
      .invoke('text')
      .then((strCount) => {
        const intCount = +strCount;
        cy.wrap(intCount).should('be.above', 0);
      });

    const timelineName = 'SIEM';
    addNameToTimeline(timelineName);
    addDescriptionToTimeline('This is the best timeline of the world');
    cy.wait(5000);

    cy.url({ timeout: 30000 }).should('match', /\w*-\w*-\w*-\w*-\w*/);
    cy.url().then((url) => {
      const matched = url.match(/\w*-\w*-\w*-\w*-\w*/);
      const newTimelineId = matched && matched.length > 0 ? matched[0] : 'null';
      expect(matched).to.have.lengthOf(1);
      closeTimeline();
      cy.visit('/app/kibana');
      cy.visit(`/app/siem#/overview?timeline\=(id:'${newTimelineId}',isOpen:!t)`);
      cy.contains('a', 'SIEM');
      cy.get(DATE_PICKER_APPLY_BUTTON_TIMELINE).invoke('text').should('not.equal', 'Updating');
      cy.get(TIMELINE_TITLE).should('have.attr', 'value', timelineName);
    });
  });
});
