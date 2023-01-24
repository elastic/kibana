/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_EXCEPTION_BTN,
  ALERT_CHECKBOX,
  CHART_SELECT,
  CLOSE_ALERT_BTN,
  CLOSE_SELECTED_ALERTS_BTN,
  EXPAND_ALERT_BTN,
  GROUP_BY_TOP_INPUT,
  LOADING_ALERTS_PANEL,
  MANAGE_ALERT_DETECTION_RULES_BTN,
  MARK_ALERT_ACKNOWLEDGED_BTN,
  OPEN_ALERT_BTN,
  SEND_ALERT_TO_TIMELINE_BTN,
  SELECT_TABLE,
  TAKE_ACTION_POPOVER_BTN,
  TIMELINE_CONTEXT_MENU_BTN,
  CLOSE_FLYOUT,
  OPEN_ANALYZER_BTN,
  TAKE_ACTION_BTN,
  TAKE_ACTION_MENU,
  ADD_ENDPOINT_EXCEPTION_BTN,
  ALERTS_HISTOGRAM_PANEL_LOADER,
  ALERTS_CONTAINER_LOADING_BAR,
  DATAGRID_CHANGES_IN_PROGRESS,
  CLOSED_ALERTS_FILTER_BTN,
  OPENED_ALERTS_FILTER_BTN,
  EVENT_CONTAINER_TABLE_LOADING,
} from '../screens/alerts';
import { LOADING_INDICATOR, REFRESH_BUTTON } from '../screens/security_header';
import {
  ALERT_TABLE_CELL_ACTIONS_ADD_TO_TIMELINE,
  TIMELINE_COLUMN_SPINNER,
} from '../screens/timeline';
import {
  UPDATE_ENRICHMENT_RANGE_BUTTON,
  ENRICHMENT_QUERY_END_INPUT,
  ENRICHMENT_QUERY_RANGE_PICKER,
  ENRICHMENT_QUERY_START_INPUT,
  THREAT_INTEL_TAB,
  CELL_EXPAND_VALUE,
  CELL_EXPANSION_POPOVER,
  USER_DETAILS_LINK,
} from '../screens/alerts_details';
import { FIELD_INPUT } from '../screens/exceptions';
import {
  DETECTION_PAGE_FILTERS_LOADING,
  DETECTION_PAGE_FILTER_GROUP_CONTEXT_MENU,
  DETECTION_PAGE_FILTER_GROUP_LOADING,
  DETECTION_PAGE_FILTER_GROUP_RESET_BUTTON,
  DETECTION_PAGE_FILTER_GROUP_WRAPPER,
  OPTION_LISTS_LOADING,
  OPTION_LIST_ACTIVE_CLEAR_SELECTION,
  OPTION_LIST_VALUES,
  OPTION_SELECTABLE,
} from '../screens/common/filter_group';
import { LOADING_SPINNER } from '../screens/common/page';
import { ALERTS_URL } from '../urls/navigation';

export const addExceptionFromFirstAlert = () => {
  expandFirstAlertActions();
  cy.get(ADD_EXCEPTION_BTN, { timeout: 10000 }).should('be.visible');
  cy.get(ADD_EXCEPTION_BTN, { timeout: 10000 }).first().click();
  cy.get(LOADING_SPINNER).should('exist');
  cy.get(LOADING_SPINNER).should('not.exist');
};

export const openAddEndpointExceptionFromFirstAlert = () => {
  expandFirstAlertActions();
  cy.root()
    .pipe(($el) => {
      $el.find(ADD_ENDPOINT_EXCEPTION_BTN).trigger('click');
      return $el.find(FIELD_INPUT);
    })
    .should('be.visible');
};

export const openAddExceptionFromAlertDetails = () => {
  cy.get(EXPAND_ALERT_BTN).first().click({ force: true });

  cy.root()
    .pipe(($el) => {
      $el.find(TAKE_ACTION_BTN).trigger('click');
      return $el.find(TAKE_ACTION_MENU);
    })
    .should('be.visible');

  cy.root()
    .pipe(($el) => {
      $el.find(ADD_EXCEPTION_BTN).trigger('click');
      return $el.find(ADD_EXCEPTION_BTN);
    })
    .should('not.be.visible');
};

export const closeFirstAlert = () => {
  expandFirstAlertActions();
  cy.get(CLOSE_ALERT_BTN)
    .pipe(($el) => $el.trigger('click'))
    .should('not.exist');
};

export const closeAlerts = () => {
  cy.get(TAKE_ACTION_POPOVER_BTN)
    .first()
    .pipe(($el) => $el.trigger('click'))
    .should('be.visible');

  cy.get(CLOSE_SELECTED_ALERTS_BTN)
    .pipe(($el) => $el.trigger('click'))
    .should('not.be.visible');
};

export const expandFirstAlertActions = () => {
  waitForAlerts();

  let count = 0;

  const click = ($el: JQuery<HTMLElement>) => {
    count++;
    return $el.trigger('click');
  };

  /*
   *
   * Sometimes it takes some time for UI to attach event listener to
   * TIMELINE_CONTEXT_MENU_BTN and cypress is too fast to click.
   * Becuase of this popover does not open when click.
   * pipe().should() makes sure that pipe function is repeated until should becomes true
   *
   * */

  cy.get(TIMELINE_CONTEXT_MENU_BTN)
    .first()
    .should('be.visible')
    .pipe(click)
    .should('have.attr', 'data-popover-open', 'true')
    .then(() => {
      cy.log(`Clicked ${count} times`);
    });
};

export const expandFirstAlert = () => {
  cy.get(EXPAND_ALERT_BTN).should('exist');

  cy.get(EXPAND_ALERT_BTN)
    .first()
    .should('exist')
    .pipe(($el) => $el.trigger('click'));
};

export const closeAlertFlyout = () => cy.get(CLOSE_FLYOUT).click();

export const viewThreatIntelTab = () => cy.get(THREAT_INTEL_TAB).click();

export const setEnrichmentDates = (from?: string, to?: string) => {
  cy.get(ENRICHMENT_QUERY_RANGE_PICKER).within(() => {
    if (from) {
      cy.get(ENRICHMENT_QUERY_START_INPUT).first().type(`{selectall}${from}{enter}`);
    }
    if (to) {
      cy.get(ENRICHMENT_QUERY_END_INPUT).type(`{selectall}${to}{enter}`);
    }
  });
  cy.get(UPDATE_ENRICHMENT_RANGE_BUTTON).click();
};

export const refreshAlertPageFilter = () => {
  // currently there is no consistent way to refresh the filters.
  // Have raised this with the kibana presentation team who provided this filter group plugin
  cy.reload();
  waitForAlerts();
};

export const togglePageFilterPopover = (filterIndex: number) => {
  cy.get(OPTION_LIST_VALUES).eq(filterIndex).click({ force: true });
};

export const clearAllSelections = () => {
  cy.get(OPTION_LIST_ACTIVE_CLEAR_SELECTION).click({ force: true });
};

export const selectPageFilterValue = (filterIndex: number, ...values: string[]) => {
  refreshAlertPageFilter();
  togglePageFilterPopover(filterIndex);
  clearAllSelections();
  values.forEach((value) => {
    cy.get(OPTION_SELECTABLE(filterIndex, value)).click({ force: true });
  });
  waitForAlerts();
  togglePageFilterPopover(filterIndex);
};

export const goToClosedAlertsOnRuleDetailsPage = () => {
  cy.get(CLOSED_ALERTS_FILTER_BTN).click();
  cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
  cy.get(REFRESH_BUTTON).should('have.attr', 'aria-label', 'Refresh query');
  cy.get(TIMELINE_COLUMN_SPINNER).should('not.exist');
};

export const goToClosedAlerts = () => {
  selectPageFilterValue(0, 'closed');
  cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
  cy.get(REFRESH_BUTTON).should('have.attr', 'aria-label', 'Refresh query');
  cy.get(TIMELINE_COLUMN_SPINNER).should('not.exist');
};

export const goToManageAlertsDetectionRules = () => {
  cy.get(MANAGE_ALERT_DETECTION_RULES_BTN).should('exist').click({ force: true });
};

export const goToOpenedAlertsOnRuleDetailsPage = () => {
  cy.get(OPENED_ALERTS_FILTER_BTN).click({ force: true });
  cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
  cy.get(REFRESH_BUTTON).should('have.attr', 'aria-label', 'Refresh query');
};

export const goToOpenedAlerts = () => {
  selectPageFilterValue(0, 'open');
  cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
  cy.get(REFRESH_BUTTON).should('have.attr', 'aria-label', 'Refresh query');
};

export const openFirstAlert = () => {
  expandFirstAlertActions();
  cy.get(OPEN_ALERT_BTN).should('be.visible').click({ force: true });
};

export const openAlerts = () => {
  cy.get(TAKE_ACTION_POPOVER_BTN).click({ force: true });
  cy.get(OPEN_ALERT_BTN).click();
};

export const selectCountTable = () => {
  cy.get(CHART_SELECT).click({ force: true });
  cy.get(SELECT_TABLE).click();
};

export const clearGroupByTopInput = () => {
  cy.get(GROUP_BY_TOP_INPUT).focus();
  cy.get(GROUP_BY_TOP_INPUT).type('{backspace}');
};

export const goToAcknowledgedAlerts = () => {
  selectPageFilterValue(0, 'acknowledged');
  cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
  cy.get(REFRESH_BUTTON).should('have.attr', 'aria-label', 'Refresh query');
  cy.get(TIMELINE_COLUMN_SPINNER).should('not.exist');
};

export const markAcknowledgedFirstAlert = () => {
  expandFirstAlertActions();
  cy.get(MARK_ALERT_ACKNOWLEDGED_BTN).click();
};

export const selectNumberOfAlerts = (numberOfAlerts: number) => {
  const click = ($el: JQuery<HTMLElement>) => {
    return $el.trigger('click');
  };
  waitForAlerts();
  for (let i = 0; i < numberOfAlerts; i++) {
    cy.get(ALERT_CHECKBOX).eq(i).pipe(click).should('have.attr', 'checked', 'true');
  }
};

export const investigateFirstAlertInTimeline = () => {
  cy.get(SEND_ALERT_TO_TIMELINE_BTN).first().click({ force: true });
};

export const openAnalyzerForFirstAlertInTimeline = () => {
  cy.get(OPEN_ANALYZER_BTN).first().click({ force: true });
};

export const addAlertPropertyToTimeline = (propertySelector: string, rowIndex: number) => {
  cy.get(propertySelector).eq(rowIndex).trigger('mouseover');
  cy.get(ALERT_TABLE_CELL_ACTIONS_ADD_TO_TIMELINE).first().click({ force: true });
};

export const waitForAlerts = () => {
  waitForPageFilters();
  cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
  cy.get(DATAGRID_CHANGES_IN_PROGRESS).should('not.be.true');
  cy.get(EVENT_CONTAINER_TABLE_LOADING).should('not.exist');
  cy.get(LOADING_INDICATOR).should('not.exist');
};

export const waitForAlertsPanelToBeLoaded = () => {
  cy.get(LOADING_ALERTS_PANEL).should('exist');
  cy.get(LOADING_ALERTS_PANEL).should('not.exist');
  cy.get(ALERTS_CONTAINER_LOADING_BAR).should('not.exist');
  cy.get(ALERTS_HISTOGRAM_PANEL_LOADER).should('not.exist');
};

export const expandAlertTableCellValue = (columnSelector: string, row = 1) => {
  cy.get(columnSelector).eq(1).focus().find(CELL_EXPAND_VALUE).click({ force: true });
};

export const scrollAlertTableColumnIntoView = (columnSelector: string) => {
  cy.get(columnSelector).eq(0).scrollIntoView();

  // Wait for data grid to populate column
  cy.waitUntil(() => cy.get(columnSelector).then(($el) => $el.length > 1), {
    interval: 500,
    timeout: 12000,
  });
};

export const openUserDetailsFlyout = () => {
  cy.get(CELL_EXPANSION_POPOVER).find(USER_DETAILS_LINK).click();
};

export const waitForPageFilters = () => {
  cy.log('Waiting for Page Filters');
  cy.url().then((urlString) => {
    const url = new URL(urlString);
    if (url.pathname.endsWith(ALERTS_URL)) {
      // since these are only valid on the alert page
      cy.get(DETECTION_PAGE_FILTER_GROUP_WRAPPER).should('exist');
      cy.get(DETECTION_PAGE_FILTER_GROUP_LOADING).should('not.exist');
      cy.get(DETECTION_PAGE_FILTERS_LOADING).should('not.exist');
      cy.get(OPTION_LISTS_LOADING).should('have.lengthOf', 0);
    } else {
      cy.log('Skipping Page Filters Wait');
    }
  });
};

export const resetFilters = () => {
  cy.get(DETECTION_PAGE_FILTER_GROUP_CONTEXT_MENU).click({ force: true });
  cy.get(DETECTION_PAGE_FILTER_GROUP_RESET_BUTTON).click({ force: true });
  waitForPageFilters();
};
