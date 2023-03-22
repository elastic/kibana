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
  filter: 'agent.name : "beats" ',
  service: 'barService',
  transactionName: 'bazName',
  transactionType: 'blarfType',
};

describe('convertSliApmParamsToApmAppDeeplinkUrl', () => {
  it('should return a correct APM deeplink when all params have a value', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl(SLI_APM_PARAMS);

    expect(url).toBe(
      '/app/apm/services/barService/overview?comparisonEnabled=true&environment=fooEnvironment&transactionType=blarfType&kuery=transaction.name%20%3A%20%22bazName%22%20and%20agent.name%20%3A%20%22beats%22%20&rangeFrom=now-30-d&rangeTo=now'
    );
  });

  it('should return a correct APM deeplink when empty duration is passed', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl({
      ...SLI_APM_PARAMS,
      duration: '',
    });

    expect(url).toBe(
      '/app/apm/services/barService/overview?comparisonEnabled=true&environment=fooEnvironment&transactionType=blarfType&kuery=transaction.name%20%3A%20%22bazName%22%20and%20agent.name%20%3A%20%22beats%22%20'
    );
  });

  it('should return a correct APM deeplink when empty environment is passed', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl({
      ...SLI_APM_PARAMS,
      environment: '',
    });

    expect(url).toBe(
      '/app/apm/services/barService/overview?comparisonEnabled=true&transactionType=blarfType&kuery=transaction.name%20%3A%20%22bazName%22%20and%20agent.name%20%3A%20%22beats%22%20&rangeFrom=now-30-d&rangeTo=now'
    );
  });

  it('should return a correct APM deeplink when empty filter is passed', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl({
      ...SLI_APM_PARAMS,
      filter: '',
    });

    expect(url).toBe(
      '/app/apm/services/barService/overview?comparisonEnabled=true&environment=fooEnvironment&transactionType=blarfType&kuery=transaction.name%20%3A%20%22bazName%22%20&rangeFrom=now-30-d&rangeTo=now'
    );
  });

  it('should return an empty string if an empty service is passed', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl({
      ...SLI_APM_PARAMS,
      service: '',
    });

    expect(url).toBe('');
  });

  it('should return a correct APM deeplink when empty transactionName is passed', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl({
      ...SLI_APM_PARAMS,
      transactionName: '',
    });

    expect(url).toBe(
      '/app/apm/services/barService/overview?comparisonEnabled=true&environment=fooEnvironment&transactionType=blarfType&kuery=%20and%20agent.name%20%3A%20%22beats%22%20&rangeFrom=now-30-d&rangeTo=now'
    );
  });

  it('should return a correct APM deeplink when empty transactionType is passed', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl({
      ...SLI_APM_PARAMS,
      transactionType: '',
    });

    expect(url).toBe(
      '/app/apm/services/barService/overview?comparisonEnabled=true&environment=fooEnvironment&kuery=transaction.name%20%3A%20%22bazName%22%20and%20agent.name%20%3A%20%22beats%22%20&rangeFrom=now-30-d&rangeTo=now'
    );
  });
});
