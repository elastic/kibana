/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_SAVED_QUERY_FORM_SAVE_BUTTON,
  ADD_SAVED_QUERY_FORM_TITLE_INPUT,
  GLOBAL_SEARCH_BAR_SAVE_BUTTON,
  GLOBAL_SEARCH_BAR_SAVE_QUERY,
} from '../screens/search_bar';

export const ABSOLUTE_DATE_RANGE = {
  url: '/app/security/network/flows/?timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)))',

  urlWithTimestamps:
    '/app/security/network/flows/?timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))',
  urlUnlinked:
    '/app/security/network/flows/?timerange=(global:(linkTo:!(),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)),timeline:(linkTo:!(),timerange:(from:%272019-08-02T20:03:29.186Z%27,kind:absolute,to:%272019-08-02T21:03:29.186Z%27)))',
  urlKqlNetworkNetwork: `/app/security/network/flows/?query=(language:kuery,query:'source.ip:%20"10.142.0.9"')&timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)))`,
  urlKqlNetworkHosts: `/app/security/network/flows/?query=(language:kuery,query:'source.ip:%20"10.142.0.9"')&timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)))`,
  urlKqlHostsNetwork: `/app/security/hosts/allHosts?query=(language:kuery,query:'source.ip:%20"10.142.0.9"')&timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)))`,
  urlKqlHostsHosts: `/app/security/hosts/allHosts?query=(language:kuery,query:'source.ip:%20"10.142.0.9"')&timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)))`,
  urlHost:
    '/app/security/hosts/authentications?timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)))',
  urlHostWithSearchFilter:
    '/app/security/hosts/authentications?timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)))&sourcerer=(default:(id:security-solution-default,selectedPatterns:!(%27auditbeat-*%27,%27filebeat-*%27,%27logs-*%27,%27winlogbeat-*%27)))&filters=!((%27$state%27:(store:appState),meta:(alias:!n,disabled:!f,key:host.ip,negate:!f,params:(query:%270.0.0.0%27),type:phrase),query:(match_phrase:(host.ip:%270.0.0.0%27))))',
  urlHostNew:
    '/app/security/hosts/authentications?timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272020-01-01T21:33:29.186Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272020-01-01T21:33:29.186Z%27)))',
};

export const openAddSavedQueryForm = () => {
  cy.get(GLOBAL_SEARCH_BAR_SAVE_QUERY).should('exist');
  cy.get(GLOBAL_SEARCH_BAR_SAVE_QUERY).should('be.visible');
  cy.get(GLOBAL_SEARCH_BAR_SAVE_QUERY).first().click();
  cy.get(GLOBAL_SEARCH_BAR_SAVE_BUTTON).should('exist');
  cy.get(GLOBAL_SEARCH_BAR_SAVE_BUTTON).should('be.visible');
  cy.get(GLOBAL_SEARCH_BAR_SAVE_BUTTON).first().click();
};

export const fillAddSavedQueryForm = () => {
  cy.get(ADD_SAVED_QUERY_FORM_TITLE_INPUT).should('exist');
  cy.get(ADD_SAVED_QUERY_FORM_TITLE_INPUT).should('be.visible');
  cy.get(ADD_SAVED_QUERY_FORM_TITLE_INPUT).type('Cypress Saved Query');
  cy.get(ADD_SAVED_QUERY_FORM_SAVE_BUTTON).click();
};
