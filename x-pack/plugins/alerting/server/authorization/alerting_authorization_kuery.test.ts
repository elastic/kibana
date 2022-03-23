/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, nodeBuilder } from '@kbn/es-query';
import { RecoveredActionGroup } from '../../common';
import {
  AlertingAuthorizationFilterType,
  asFiltersByRuleTypeAndConsumer,
  ensureFieldIsSafeForQuery,
  asFiltersBySpaceId,
} from './alerting_authorization_kuery';

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
            isExportable: true,
            authorizedConsumers: {
              myApp: { read: true, all: true },
            },
            enabledInLicense: true,
          },
        ]),
        {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
          },
        },
        'space1'
      )
    ).toEqual(
      nodeBuilder.or([
        nodeBuilder.and([
          nodeBuilder.is('path.to.rule_type_id', 'myAppAlertType'),
          nodeBuilder.or([nodeBuilder.is('consumer-field', 'myApp')]),
        ]),
      ])
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
            isExportable: true,
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
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
          },
        },
        'space1'
      )
    ).toEqual(
      nodeBuilder.or([
        nodeBuilder.and([
          nodeBuilder.is('path.to.rule_type_id', 'myAppAlertType'),
          nodeBuilder.or([
            nodeBuilder.is('consumer-field', 'alerts'),
            nodeBuilder.is('consumer-field', 'myApp'),
            nodeBuilder.is('consumer-field', 'myOtherApp'),
          ]),
        ]),
      ])
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
            isExportable: true,
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
            isExportable: true,
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
            isExportable: true,
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
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
          },
        },
        'space1'
      )
    ).toEqual(
      fromKueryExpression(
        `((path.to.rule_type_id:myAppAlertType and consumer-field:(alerts or myApp or myOtherApp or myAppWithSubFeature)) or (path.to.rule_type_id:myOtherAppAlertType and consumer-field:(alerts or myApp or myOtherApp or myAppWithSubFeature)) or (path.to.rule_type_id:mySecondAppAlertType and consumer-field:(alerts or myApp or myOtherApp or myAppWithSubFeature)))`
      )
    );
  });

  test('constructs KQL filter with spaceId filter when spaceIds field path exists', async () => {
    expect(
      asFiltersByRuleTypeAndConsumer(
        new Set([
          {
            actionGroups: [],
            defaultActionGroupId: 'default',
            minimumLicenseRequired: 'basic',
            isExportable: true,
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
            isExportable: true,
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
        ]),
        {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
            spaceIds: 'path.to.spaceIds',
          },
        },
        'space1'
      )
    ).toEqual(
      fromKueryExpression(
        `((path.to.rule_type_id:myAppAlertType and consumer-field:(alerts or myApp or myOtherApp or myAppWithSubFeature) and path.to.spaceIds:space1) or (path.to.rule_type_id:myOtherAppAlertType and consumer-field:(alerts or myApp or myOtherApp or myAppWithSubFeature) and path.to.spaceIds:space1))`
      )
    );
  });

  test('constructs KQL filter without spaceId filter when spaceIds path is specified, but spaceId is undefined', async () => {
    expect(
      asFiltersByRuleTypeAndConsumer(
        new Set([
          {
            actionGroups: [],
            defaultActionGroupId: 'default',
            minimumLicenseRequired: 'basic',
            isExportable: true,
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
            isExportable: true,
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
        ]),
        {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
            spaceIds: 'path.to.spaceIds',
          },
        },
        undefined
      )
    ).toEqual(
      fromKueryExpression(
        `((path.to.rule_type_id:myAppAlertType and consumer-field:(alerts or myApp or myOtherApp or myAppWithSubFeature)) or (path.to.rule_type_id:myOtherAppAlertType and consumer-field:(alerts or myApp or myOtherApp or myAppWithSubFeature)))`
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
            isExportable: true,
            authorizedConsumers: {
              myApp: { read: true, all: true },
            },
            enabledInLicense: true,
          },
        ]),
        {
          type: AlertingAuthorizationFilterType.ESDSL,
          fieldNames: {
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
          },
        },
        'space1'
      )
    ).toEqual({
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  match: {
                    'path.to.rule_type_id': 'myAppAlertType',
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
            isExportable: true,
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
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
          },
        },
        'space1'
      )
    ).toEqual({
      bool: {
        filter: [
          {
            bool: {
              should: [{ match: { 'path.to.rule_type_id': 'myAppAlertType' } }],
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
            isExportable: true,
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
            isExportable: true,
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
            isExportable: true,
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
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
          },
        },
        'space1'
      )
    ).toEqual({
      bool: {
        should: [
          {
            bool: {
              filter: [
                {
                  bool: {
                    should: [{ match: { 'path.to.rule_type_id': 'myAppAlertType' } }],
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
                    should: [{ match: { 'path.to.rule_type_id': 'myOtherAppAlertType' } }],
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
                    should: [{ match: { 'path.to.rule_type_id': 'mySecondAppAlertType' } }],
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

describe('asFiltersBySpaceId', () => {
  test('returns ES dsl filter of spaceId', () => {
    expect(
      asFiltersBySpaceId(
        {
          type: AlertingAuthorizationFilterType.ESDSL,
          fieldNames: {
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
            spaceIds: 'path.to.space.id',
          },
        },
        'space1'
      )
    ).toEqual({
      bool: { minimum_should_match: 1, should: [{ match: { 'path.to.space.id': 'space1' } }] },
    });
  });

  test('returns KQL filter of spaceId', () => {
    expect(
      asFiltersBySpaceId(
        {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
            spaceIds: 'path.to.space.id',
          },
        },
        'space1'
      )
    ).toEqual(fromKueryExpression('(path.to.space.id: space1)'));
  });

  test('returns undefined if no path to spaceIds is provided', () => {
    expect(
      asFiltersBySpaceId(
        {
          type: AlertingAuthorizationFilterType.ESDSL,
          fieldNames: {
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
          },
        },
        'space1'
      )
    ).toBeUndefined();
  });

  test('returns undefined if spaceId is undefined', () => {
    expect(
      asFiltersBySpaceId(
        {
          type: AlertingAuthorizationFilterType.ESDSL,
          fieldNames: {
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
            spaceIds: 'path.to.space.id',
          },
        },
        undefined
      )
    ).toBeUndefined();
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
