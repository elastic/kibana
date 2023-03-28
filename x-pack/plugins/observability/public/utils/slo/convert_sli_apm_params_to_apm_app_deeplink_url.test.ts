/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertSliApmParamsToApmAppDeeplinkUrl } from './convert_sli_apm_params_to_apm_app_deeplink_url';

const SLI_APM_PARAMS = {
  duration: '30-d',
  environment: 'fooEnvironment',
  filter: 'agent.name : "beats" and agent.version : 3.4.12 ',
  service: 'barService',
  transactionName: 'bazName',
  transactionType: 'blarfType',
};

describe('convertSliApmParamsToApmAppDeeplinkUrl', () => {
  it('should return a correct APM deeplink when all params have a value', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl(SLI_APM_PARAMS);

    expect(url).toMatchInlineSnapshot(
      `"/app/apm/services/barService/overview?comparisonEnabled=true&environment=fooEnvironment&transactionType=blarfType&rangeFrom=now-30-d&rangeTo=now&kuery=transaction.name+%3A+%22bazName%22+and+agent.name+%3A+%22beats%22+and+agent.version+%3A+3.4.12+"`
    );
  });

  it('should return a correct APM deeplink when empty duration is passed', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl({
      ...SLI_APM_PARAMS,
      duration: '',
    });

    expect(url).toMatchInlineSnapshot(
      `"/app/apm/services/barService/overview?comparisonEnabled=true&environment=fooEnvironment&transactionType=blarfType&kuery=transaction.name+%3A+%22bazName%22+and+agent.name+%3A+%22beats%22+and+agent.version+%3A+3.4.12+"`
    );
  });

  it('should return a correct APM deeplink when empty environment is passed', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl({
      ...SLI_APM_PARAMS,
      environment: '',
    });

    expect(url).toMatchInlineSnapshot(
      `"/app/apm/services/barService/overview?comparisonEnabled=true&transactionType=blarfType&rangeFrom=now-30-d&rangeTo=now&kuery=transaction.name+%3A+%22bazName%22+and+agent.name+%3A+%22beats%22+and+agent.version+%3A+3.4.12+"`
    );
  });

  it('should return a correct APM deeplink when empty filter is passed', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl({
      ...SLI_APM_PARAMS,
      filter: '',
    });

    expect(url).toMatchInlineSnapshot(
      `"/app/apm/services/barService/overview?comparisonEnabled=true&environment=fooEnvironment&transactionType=blarfType&rangeFrom=now-30-d&rangeTo=now&kuery=transaction.name+%3A+%22bazName%22"`
    );
  });

  it('should return an empty string if an empty service is passed', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl({
      ...SLI_APM_PARAMS,
      service: '',
    });

    expect(url).toMatchInlineSnapshot(`""`);
  });

  it('should return a correct APM deeplink when empty transactionName is passed', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl({
      ...SLI_APM_PARAMS,
      transactionName: '',
    });

    expect(url).toMatchInlineSnapshot(
      `"/app/apm/services/barService/overview?comparisonEnabled=true&environment=fooEnvironment&transactionType=blarfType&rangeFrom=now-30-d&rangeTo=now&kuery=agent.name+%3A+%22beats%22+and+agent.version+%3A+3.4.12+"`
    );
  });

  it('should return a correct APM deeplink when empty transactionType is passed', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl({
      ...SLI_APM_PARAMS,
      transactionType: '',
    });

    expect(url).toMatchInlineSnapshot(
      `"/app/apm/services/barService/overview?comparisonEnabled=true&environment=fooEnvironment&rangeFrom=now-30-d&rangeTo=now&kuery=transaction.name+%3A+%22bazName%22+and+agent.name+%3A+%22beats%22+and+agent.version+%3A+3.4.12+"`
    );
  });
});
