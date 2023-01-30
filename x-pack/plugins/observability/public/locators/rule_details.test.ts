/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTIVE_ALERTS } from '../components/shared/alert_search_bar/constants';
import { EXECUTION_TAB, ALERTS_TAB } from '../pages/rule_details/constants';
import { getRuleDetailsPath, RuleDetailsLocatorDefinition } from './rule_details';

describe('RuleDetailsLocator', () => {
  const locator = new RuleDetailsLocatorDefinition();
  const mockedRuleId = '389d3318-7e10-4996-bb45-128e1607fb7e';

  it('should return correct url when only ruleId is provided', async () => {
    const location = await locator.getLocation({ ruleId: mockedRuleId });
    expect(location.app).toEqual('observability');
    expect(location.path).toEqual(getRuleDetailsPath(mockedRuleId));
  });

  it('should return correct url when tabId is execution', async () => {
    const location = await locator.getLocation({ ruleId: mockedRuleId, tabId: EXECUTION_TAB });
    expect(location.path).toMatchInlineSnapshot(
      `"/alerts/rules/389d3318-7e10-4996-bb45-128e1607fb7e?tabId=execution"`
    );
  });

  it('should return correct url when tabId is alerts without extra search params', async () => {
    const location = await locator.getLocation({ ruleId: mockedRuleId, tabId: ALERTS_TAB });
    expect(location.path).toMatchInlineSnapshot(
      `"/alerts/rules/389d3318-7e10-4996-bb45-128e1607fb7e?tabId=alerts&searchBarParams=(kuery:'',rangeFrom:now-15m,rangeTo:now,status:all)"`
    );
  });

  it('should return correct url when tabId is alerts with search params', async () => {
    const location = await locator.getLocation({
      ruleId: mockedRuleId,
      tabId: ALERTS_TAB,
      rangeFrom: 'mockedRangeTo',
      rangeTo: 'mockedRangeFrom',
      kuery: 'mockedKuery',
      status: ACTIVE_ALERTS.status,
    });
    expect(location.path).toMatchInlineSnapshot(
      `"/alerts/rules/389d3318-7e10-4996-bb45-128e1607fb7e?tabId=alerts&searchBarParams=(kuery:mockedKuery,rangeFrom:mockedRangeTo,rangeTo:mockedRangeFrom,status:active)"`
    );
  });
});
