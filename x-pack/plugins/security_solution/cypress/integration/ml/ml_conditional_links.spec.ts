/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KQL_INPUT } from '../../screens/security_header';
import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';

import {
  mlHostMultiHostKqlQuery,
  mlHostMultiHostNullKqlQuery,
  mlHostSingleHostKqlQuery,
  mlHostSingleHostKqlQueryVariable,
  mlHostSingleHostNullKqlQuery,
  mlHostVariableHostKqlQuery,
  mlHostVariableHostNullKqlQuery,
  mlNetworkKqlQuery,
  mlNetworkMultipleIpKqlQuery,
  mlNetworkMultipleIpNullKqlQuery,
  mlNetworkNullKqlQuery,
  mlNetworkSingleIpKqlQuery,
  mlNetworkSingleIpNullKqlQuery,
} from '../../urls/ml_conditional_links';

describe('ml conditional links', () => {
  before(() => {
    cleanKibana();
  });

  it('sets the KQL from a single IP with a value for the query', () => {
    loginAndWaitForPageWithoutDateRange(mlNetworkSingleIpKqlQuery);
    cy.get(KQL_INPUT).should(
      'have.text',
      '(process.name: "conhost.exe" or process.name: "sc.exe")'
    );
  });

  it('sets the KQL from a multiple IPs with a null for the query', () => {
    loginAndWaitForPageWithoutDateRange(mlNetworkMultipleIpNullKqlQuery);
    cy.get(KQL_INPUT).should(
      'have.text',
      '((source.ip: "127.0.0.1" or destination.ip: "127.0.0.1") or (source.ip: "127.0.0.2" or destination.ip: "127.0.0.2"))'
    );
  });

  it('sets the KQL from a multiple IPs with a value for the query', () => {
    loginAndWaitForPageWithoutDateRange(mlNetworkMultipleIpKqlQuery);
    cy.get(KQL_INPUT).should(
      'have.text',
      '((source.ip: "127.0.0.1" or destination.ip: "127.0.0.1") or (source.ip: "127.0.0.2" or destination.ip: "127.0.0.2")) and ((process.name: "conhost.exe" or process.name: "sc.exe"))'
    );
  });

  it('sets the KQL from a $ip$ with a value for the query', () => {
    loginAndWaitForPageWithoutDateRange(mlNetworkKqlQuery);
    cy.get(KQL_INPUT).should(
      'have.text',
      '(process.name: "conhost.exe" or process.name: "sc.exe")'
    );
  });

  it('sets the KQL from a single host name with a value for query', () => {
    loginAndWaitForPageWithoutDateRange(mlHostSingleHostKqlQuery);
    cy.get(KQL_INPUT)
      .invoke('text')
      .should('eq', '(process.name: "conhost.exe" or process.name: "sc.exe")');
  });

  it('sets the KQL from a multiple host names with null for query', () => {
    loginAndWaitForPageWithoutDateRange(mlHostMultiHostNullKqlQuery);
    cy.get(KQL_INPUT).should(
      'have.text',
      '(host.name: "siem-windows" or host.name: "siem-suricata")'
    );
  });

  it('sets the KQL from a multiple host names with a value for query', () => {
    loginAndWaitForPageWithoutDateRange(mlHostMultiHostKqlQuery);
    cy.get(KQL_INPUT).should(
      'have.text',
      '(host.name: "siem-windows" or host.name: "siem-suricata") and ((process.name: "conhost.exe" or process.name: "sc.exe"))'
    );
  });

  it('sets the KQL from a undefined/null host name but with a value for query', () => {
    loginAndWaitForPageWithoutDateRange(mlHostVariableHostKqlQuery);
    cy.get(KQL_INPUT).should(
      'have.text',
      '(process.name: "conhost.exe" or process.name: "sc.exe")'
    );
  });

  it('redirects from a single IP with a null for the query', () => {
    loginAndWaitForPageWithoutDateRange(mlNetworkSingleIpNullKqlQuery);
    cy.url().should(
      'include',
      'app/security/network/ip/127.0.0.1/source?timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-28T11:00:00.000Z%27,kind:absolute,to:%272019-08-28T13:59:59.999Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-28T11:00:00.000Z%27,kind:absolute,to:%272019-08-28T13:59:59.999Z%27)))&sourcerer=(default:(id:security-solution-default,selectedPatterns:!(%27auditbeat-*%27)))'
    );
  });

  it('redirects from a single IP with a value for the query', () => {
    loginAndWaitForPageWithoutDateRange(mlNetworkSingleIpKqlQuery);
    cy.url().should(
      'include',
      '/app/security/network/ip/127.0.0.1/source?query=(language:kuery,query:%27(process.name:%20%22conhost.exe%22%20or%20process.name:%20%22sc.exe%22)%27)&timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-28T11:00:00.000Z%27,kind:absolute,to:%272019-08-28T13:59:59.999Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-28T11:00:00.000Z%27,kind:absolute,to:%272019-08-28T13:59:59.999Z%27)))&sourcerer=(default:(id:security-solution-default,selectedPatterns:!(%27auditbeat-*%27)))'
    );
  });

  it('redirects from a multiple IPs with a null for the query', () => {
    loginAndWaitForPageWithoutDateRange(mlNetworkMultipleIpNullKqlQuery);
    cy.url().should(
      'include',
      'app/security/network/flows?query=(language:kuery,query:%27((source.ip:%20%22127.0.0.1%22%20or%20destination.ip:%20%22127.0.0.1%22)%20or%20(source.ip:%20%22127.0.0.2%22%20or%20destination.ip:%20%22127.0.0.2%22))%27)&timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-28T11:00:00.000Z%27,kind:absolute,to:%272019-08-28T13:59:59.999Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-28T11:00:00.000Z%27,kind:absolute,to:%272019-08-28T13:59:59.999Z%27)))&sourcerer=(default:(id:security-solution-default,selectedPatterns:!(%27auditbeat-*%27)))'
    );
  });

  it('redirects from a multiple IPs with a value for the query', () => {
    loginAndWaitForPageWithoutDateRange(mlNetworkMultipleIpKqlQuery);
    cy.url().should(
      'include',
      '/app/security/network/flows?query=(language:kuery,query:%27((source.ip:%20%22127.0.0.1%22%20or%20destination.ip:%20%22127.0.0.1%22)%20or%20(source.ip:%20%22127.0.0.2%22%20or%20destination.ip:%20%22127.0.0.2%22))%20and%20((process.name:%20%22conhost.exe%22%20or%20process.name:%20%22sc.exe%22))%27)&timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-28T11:00:00.000Z%27,kind:absolute,to:%272019-08-28T13:59:59.999Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-28T11:00:00.000Z%27,kind:absolute,to:%272019-08-28T13:59:59.999Z%27)))&sourcerer=(default:(id:security-solution-default,selectedPatterns:!(%27auditbeat-*%27)))'
    );
  });

  it('redirects from a $ip$ with a null query', () => {
    loginAndWaitForPageWithoutDateRange(mlNetworkNullKqlQuery);
    cy.url().should(
      'include',
      '/app/security/network/flows?timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-28T11:00:00.000Z%27,kind:absolute,to:%272019-08-28T13:59:59.999Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-28T11:00:00.000Z%27,kind:absolute,to:%272019-08-28T13:59:59.999Z%27)))&sourcerer=(default:(id:security-solution-default,selectedPatterns:!(%27auditbeat-*%27)))'
    );
  });

  it('redirects from a $ip$ with a value for the query', () => {
    loginAndWaitForPageWithoutDateRange(mlNetworkKqlQuery);

    cy.url().should(
      'include',
      `/app/security/network/flows?query=(language:kuery,query:%27(process.name:%20%22conhost.exe%22%20or%20process.name:%20%22sc.exe%22)%27)&timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-28T11:00:00.000Z%27,kind:absolute,to:%272019-08-28T13:59:59.999Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-28T11:00:00.000Z%27,kind:absolute,to:%272019-08-28T13:59:59.999Z%27)))&sourcerer=(default:(id:security-solution-default,selectedPatterns:!(%27auditbeat-*%27)))`
    );
  });

  it('redirects from a single host name with a null for the query', () => {
    loginAndWaitForPageWithoutDateRange(mlHostSingleHostNullKqlQuery);
    cy.url().should(
      'include',
      '/app/security/hosts/siem-windows/anomalies?timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-06-06T06:00:00.000Z%27,kind:absolute,to:%272019-06-07T05:59:59.999Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-06-06T06:00:00.000Z%27,kind:absolute,to:%272019-06-07T05:59:59.999Z%27)))&sourcerer=(default:(id:security-solution-default,selectedPatterns:!(%27auditbeat-*%27)))'
    );
  });

  it('redirects from a host name with a variable in the query', () => {
    loginAndWaitForPageWithoutDateRange(mlHostSingleHostKqlQueryVariable);
    cy.url().should(
      'include',
      '/app/security/hosts/siem-windows/anomalies?timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-06-06T06:00:00.000Z%27,kind:absolute,to:%272019-06-07T05:59:59.999Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-06-06T06:00:00.000Z%27,kind:absolute,to:%272019-06-07T05:59:59.999Z%27)))&sourcerer=(default:(id:security-solution-default,selectedPatterns:!(%27auditbeat-*%27)))'
    );
  });

  it('redirects from a single host name with a value for query', () => {
    loginAndWaitForPageWithoutDateRange(mlHostSingleHostKqlQuery);
    cy.url().should(
      'include',
      '/app/security/hosts/siem-windows/anomalies?query=(language:kuery,query:%27(process.name:%20%22conhost.exe%22%20or%20process.name:%20%22sc.exe%22)%27)&timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-06-06T06:00:00.000Z%27,kind:absolute,to:%272019-06-07T05:59:59.999Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-06-06T06:00:00.000Z%27,kind:absolute,to:%272019-06-07T05:59:59.999Z%27)))&sourcerer=(default:(id:security-solution-default,selectedPatterns:!(%27auditbeat-*%27)))'
    );
  });

  it('redirects from a multiple host names with null for query', () => {
    loginAndWaitForPageWithoutDateRange(mlHostMultiHostNullKqlQuery);
    cy.url().should(
      'include',
      '/app/security/hosts/anomalies?query=(language:kuery,query:%27(host.name:%20%22siem-windows%22%20or%20host.name:%20%22siem-suricata%22)%27)&timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-06-06T06:00:00.000Z%27,kind:absolute,to:%272019-06-07T05:59:59.999Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-06-06T06:00:00.000Z%27,kind:absolute,to:%272019-06-07T05:59:59.999Z%27)))&sourcerer=(default:(id:security-solution-default,selectedPatterns:!(%27auditbeat-*%27)))'
    );
  });

  it('redirects from a multiple host names with a value for query', () => {
    loginAndWaitForPageWithoutDateRange(mlHostMultiHostKqlQuery);
    cy.url().should(
      'include',
      '/app/security/hosts/anomalies?query=(language:kuery,query:%27(host.name:%20%22siem-windows%22%20or%20host.name:%20%22siem-suricata%22)%20and%20((process.name:%20%22conhost.exe%22%20or%20process.name:%20%22sc.exe%22))%27)&timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-06-06T06:00:00.000Z%27,kind:absolute,to:%272019-06-07T05:59:59.999Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-06-06T06:00:00.000Z%27,kind:absolute,to:%272019-06-07T05:59:59.999Z%27)))&sourcerer=(default:(id:security-solution-default,selectedPatterns:!(%27auditbeat-*%27)))'
    );
  });

  it('redirects from a undefined/null host name with a null for the KQL', () => {
    loginAndWaitForPageWithoutDateRange(mlHostVariableHostNullKqlQuery);
    cy.url().should(
      'include',
      '/app/security/hosts/anomalies?timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-06-06T06:00:00.000Z%27,kind:absolute,to:%272019-06-07T05:59:59.999Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-06-06T06:00:00.000Z%27,kind:absolute,to:%272019-06-07T05:59:59.999Z%27)))&sourcerer=(default:(id:security-solution-default,selectedPatterns:!(%27auditbeat-*%27)))'
    );
  });

  it('redirects from a undefined/null host name but with a value for query', () => {
    loginAndWaitForPageWithoutDateRange(mlHostVariableHostKqlQuery);
    cy.url().should(
      'include',
      '/app/security/hosts/anomalies?query=(language:kuery,query:%27(process.name:%20%22conhost.exe%22%20or%20process.name:%20%22sc.exe%22)%27)&timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-06-06T06:00:00.000Z%27,kind:absolute,to:%272019-06-07T05:59:59.999Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-06-06T06:00:00.000Z%27,kind:absolute,to:%272019-06-07T05:59:59.999Z%27)))&sourcerer=(default:(id:security-solution-default,selectedPatterns:!(%27auditbeat-*%27)))'
    );
  });
});
