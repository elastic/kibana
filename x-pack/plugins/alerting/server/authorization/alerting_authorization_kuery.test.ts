/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RecoveredActionGroup } from '../../common';
import {
  AlertingAuthorizationFilterType,
  asFiltersByRuleTypeAndConsumer,
  ensureFieldIsSafeForQuery,
} from './alerting_authorization_kuery';
import { esKuery } from '../../../../../src/plugins/data/server';

describe('asKqlFiltersByRuleTypeAndConsumer', () => {
  test('constructs KQL filter for single rule type with single authorized consumer', async () => {
    expect(
      asFiltersByRuleTypeAndConsumer(
        new Set([
          {
            actionGroups: [],
            defaultActionGroupId: 'default',
            recoveryActionGroup: RecoveredActionGroup,
            id: 'myAppAlertType',
            name: 'myAppAlertType',
            producer: 'myApp',
            minimumLicenseRequired: 'basic',
            authorizedConsumers: {
              myApp: { read: true, all: true },
            },
            enabledInLicense: true,
          },
        ]),
        {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'path.to.rule.id',
            consumer: 'consumer-field',
          },
        }
      )
    ).toEqual(
      esKuery.fromKueryExpression(`((path.to.rule.id:myAppAlertType and consumer-field:(myApp)))`)
    );
  });

  test('constructs KQL filter for single rule type with multiple authorized consumers', async () => {
    expect(
      asFiltersByRuleTypeAndConsumer(
        new Set([
          {
            actionGroups: [],
            defaultActionGroupId: 'default',
            minimumLicenseRequired: 'basic',
            recoveryActionGroup: RecoveredActionGroup,
            id: 'myAppAlertType',
            name: 'myAppAlertType',
            producer: 'myApp',
            authorizedConsumers: {
              alerts: { read: true, all: true },
              myApp: { read: true, all: true },
              myOtherApp: { read: true, all: true },
            },
            enabledInLicense: true,
          },
        ]),
        {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'path.to.rule.id',
            consumer: 'consumer-field',
          },
        }
      )
    ).toEqual(
      esKuery.fromKueryExpression(
        `((path.to.rule.id:myAppAlertType and consumer-field:(alerts or myApp or myOtherApp)))`
      )
    );
  });

  test('constructs KQL filter for multiple rule types across authorized consumer', async () => {
    expect(
      asFiltersByRuleTypeAndConsumer(
        new Set([
          {
            actionGroups: [],
            defaultActionGroupId: 'default',
            minimumLicenseRequired: 'basic',
            recoveryActionGroup: RecoveredActionGroup,
            id: 'myAppAlertType',
            name: 'myAppAlertType',
            producer: 'myApp',
            authorizedConsumers: {
              alerts: { read: true, all: true },
              myApp: { read: true, all: true },
              myOtherApp: { read: true, all: true },
              myAppWithSubFeature: { read: true, all: true },
            },
            enabledInLicense: true,
          },
          {
            actionGroups: [],
            defaultActionGroupId: 'default',
            minimumLicenseRequired: 'basic',
            recoveryActionGroup: RecoveredActionGroup,
            id: 'myOtherAppAlertType',
            name: 'myOtherAppAlertType',
            producer: 'alerts',
            authorizedConsumers: {
              alerts: { read: true, all: true },
              myApp: { read: true, all: true },
              myOtherApp: { read: true, all: true },
              myAppWithSubFeature: { read: true, all: true },
            },
            enabledInLicense: true,
          },
          {
            actionGroups: [],
            defaultActionGroupId: 'default',
            minimumLicenseRequired: 'basic',
            recoveryActionGroup: RecoveredActionGroup,
            id: 'mySecondAppAlertType',
            name: 'mySecondAppAlertType',
            producer: 'myApp',
            authorizedConsumers: {
              alerts: { read: true, all: true },
              myApp: { read: true, all: true },
              myOtherApp: { read: true, all: true },
              myAppWithSubFeature: { read: true, all: true },
            },
            enabledInLicense: true,
          },
        ]),
        {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'path.to.rule.id',
            consumer: 'consumer-field',
          },
        }
      )
    ).toEqual(
      esKuery.fromKueryExpression(
        `((path.to.rule.id:myAppAlertType and consumer-field:(alerts or myApp or myOtherApp or myAppWithSubFeature)) or (path.to.rule.id:myOtherAppAlertType and consumer-field:(alerts or myApp or myOtherApp or myAppWithSubFeature)) or (path.to.rule.id:mySecondAppAlertType and consumer-field:(alerts or myApp or myOtherApp or myAppWithSubFeature)))`
      )
    );
  });
});

describe('asEsDslFiltersByRuleTypeAndConsumer', () => {
  test('constructs ES DSL filter for single rule type with single authorized consumer', async () => {
    expect(
      asFiltersByRuleTypeAndConsumer(
        new Set([
          {
            actionGroups: [],
            defaultActionGroupId: 'default',
            recoveryActionGroup: RecoveredActionGroup,
            id: 'myAppAlertType',
            name: 'myAppAlertType',
            producer: 'myApp',
            minimumLicenseRequired: 'basic',
            authorizedConsumers: {
              myApp: { read: true, all: true },
            },
            enabledInLicense: true,
          },
        ]),
        {
          type: AlertingAuthorizationFilterType.ESDSL,
          fieldNames: {
            ruleTypeId: 'path.to.rule.id',
            consumer: 'consumer-field',
          },
        }
      )
    ).toEqual({
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  match: {
                    'path.to.rule.id': 'myAppAlertType',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          {
            bool: {
              should: [
                {
                  match: {
                    'consumer-field': 'myApp',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    });
  });

  test('constructs ES DSL filter for single rule type with multiple authorized consumers', async () => {
    expect(
      asFiltersByRuleTypeAndConsumer(
        new Set([
          {
            actionGroups: [],
            defaultActionGroupId: 'default',
            minimumLicenseRequired: 'basic',
            recoveryActionGroup: RecoveredActionGroup,
            id: 'myAppAlertType',
            name: 'myAppAlertType',
            producer: 'myApp',
            authorizedConsumers: {
              alerts: { read: true, all: true },
              myApp: { read: true, all: true },
              myOtherApp: { read: true, all: true },
            },
            enabledInLicense: true,
          },
        ]),
        {
          type: AlertingAuthorizationFilterType.ESDSL,
          fieldNames: {
            ruleTypeId: 'path.to.rule.id',
            consumer: 'consumer-field',
          },
        }
      )
    ).toEqual({
      bool: {
        filter: [
          {
            bool: {
              should: [{ match: { 'path.to.rule.id': 'myAppAlertType' } }],
              minimum_should_match: 1,
            },
          },
          {
            bool: {
              should: [
                {
                  bool: {
                    should: [{ match: { 'consumer-field': 'alerts' } }],
                    minimum_should_match: 1,
                  },
                },
                {
                  bool: {
                    should: [{ match: { 'consumer-field': 'myApp' } }],
                    minimum_should_match: 1,
                  },
                },
                {
                  bool: {
                    should: [{ match: { 'consumer-field': 'myOtherApp' } }],
                    minimum_should_match: 1,
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    });
  });

  test('constructs ES DSL filter for multiple rule types across authorized consumer', async () => {
    expect(
      asFiltersByRuleTypeAndConsumer(
        new Set([
          {
            actionGroups: [],
            defaultActionGroupId: 'default',
            minimumLicenseRequired: 'basic',
            recoveryActionGroup: RecoveredActionGroup,
            id: 'myAppAlertType',
            name: 'myAppAlertType',
            producer: 'myApp',
            authorizedConsumers: {
              alerts: { read: true, all: true },
              myApp: { read: true, all: true },
              myOtherApp: { read: true, all: true },
              myAppWithSubFeature: { read: true, all: true },
            },
            enabledInLicense: true,
          },
          {
            actionGroups: [],
            defaultActionGroupId: 'default',
            minimumLicenseRequired: 'basic',
            recoveryActionGroup: RecoveredActionGroup,
            id: 'myOtherAppAlertType',
            name: 'myOtherAppAlertType',
            producer: 'alerts',
            authorizedConsumers: {
              alerts: { read: true, all: true },
              myApp: { read: true, all: true },
              myOtherApp: { read: true, all: true },
              myAppWithSubFeature: { read: true, all: true },
            },
            enabledInLicense: true,
          },
          {
            actionGroups: [],
            defaultActionGroupId: 'default',
            minimumLicenseRequired: 'basic',
            recoveryActionGroup: RecoveredActionGroup,
            id: 'mySecondAppAlertType',
            name: 'mySecondAppAlertType',
            producer: 'myApp',
            authorizedConsumers: {
              alerts: { read: true, all: true },
              myApp: { read: true, all: true },
              myOtherApp: { read: true, all: true },
              myAppWithSubFeature: { read: true, all: true },
            },
            enabledInLicense: true,
          },
        ]),
        {
          type: AlertingAuthorizationFilterType.ESDSL,
          fieldNames: {
            ruleTypeId: 'path.to.rule.id',
            consumer: 'consumer-field',
          },
        }
      )
    ).toEqual({
      bool: {
        should: [
          {
            bool: {
              filter: [
                {
                  bool: {
                    should: [{ match: { 'path.to.rule.id': 'myAppAlertType' } }],
                    minimum_should_match: 1,
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        bool: {
                          should: [{ match: { 'consumer-field': 'alerts' } }],
                          minimum_should_match: 1,
                        },
                      },
                      {
                        bool: {
                          should: [{ match: { 'consumer-field': 'myApp' } }],
                          minimum_should_match: 1,
                        },
                      },
                      {
                        bool: {
                          should: [{ match: { 'consumer-field': 'myOtherApp' } }],
                          minimum_should_match: 1,
                        },
                      },
                      {
                        bool: {
                          should: [{ match: { 'consumer-field': 'myAppWithSubFeature' } }],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
          {
            bool: {
              filter: [
                {
                  bool: {
                    should: [{ match: { 'path.to.rule.id': 'myOtherAppAlertType' } }],
                    minimum_should_match: 1,
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        bool: {
                          should: [{ match: { 'consumer-field': 'alerts' } }],
                          minimum_should_match: 1,
                        },
                      },
                      {
                        bool: {
                          should: [{ match: { 'consumer-field': 'myApp' } }],
                          minimum_should_match: 1,
                        },
                      },
                      {
                        bool: {
                          should: [{ match: { 'consumer-field': 'myOtherApp' } }],
                          minimum_should_match: 1,
                        },
                      },
                      {
                        bool: {
                          should: [{ match: { 'consumer-field': 'myAppWithSubFeature' } }],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
          {
            bool: {
              filter: [
                {
                  bool: {
                    should: [{ match: { 'path.to.rule.id': 'mySecondAppAlertType' } }],
                    minimum_should_match: 1,
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        bool: {
                          should: [{ match: { 'consumer-field': 'alerts' } }],
                          minimum_should_match: 1,
                        },
                      },
                      {
                        bool: {
                          should: [{ match: { 'consumer-field': 'myApp' } }],
                          minimum_should_match: 1,
                        },
                      },
                      {
                        bool: {
                          should: [{ match: { 'consumer-field': 'myOtherApp' } }],
                          minimum_should_match: 1,
                        },
                      },
                      {
                        bool: {
                          should: [{ match: { 'consumer-field': 'myAppWithSubFeature' } }],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });
});

describe('ensureFieldIsSafeForQuery', () => {
  test('throws if field contains character that isnt safe in a KQL query', () => {
    expect(() => ensureFieldIsSafeForQuery('id', 'alert-*')).toThrowError(
      `expected id not to include invalid character: *`
    );

    expect(() => ensureFieldIsSafeForQuery('id', '<=""')).toThrowError(
      `expected id not to include invalid character: <=`
    );

    expect(() => ensureFieldIsSafeForQuery('id', '>=""')).toThrowError(
      `expected id not to include invalid character: >=`
    );

    expect(() => ensureFieldIsSafeForQuery('id', '1 or alertid:123')).toThrowError(
      `expected id not to include whitespace and invalid character: :`
    );

    expect(() => ensureFieldIsSafeForQuery('id', ') or alertid:123')).toThrowError(
      `expected id not to include whitespace and invalid characters: ), :`
    );

    expect(() => ensureFieldIsSafeForQuery('id', 'some space')).toThrowError(
      `expected id not to include whitespace`
    );
  });

  test('doesnt throws if field is safe as part of a KQL query', () => {
    expect(() => ensureFieldIsSafeForQuery('id', '123-0456-678')).not.toThrow();
  });
});
