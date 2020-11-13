/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { esKuery } from '../../../../../src/plugins/data/server';
import {
  asFiltersByAlertTypeAndConsumer,
  ensureFieldIsSafeForQuery,
} from './alerts_authorization_kuery';

describe('asFiltersByAlertTypeAndConsumer', () => {
  test('constructs filter for single alert type with single authorized consumer', async () => {
    expect(
      asFiltersByAlertTypeAndConsumer(
        new Set([
          {
            actionGroups: [],
            defaultActionGroupId: 'default',
            id: 'myAppAlertType',
            name: 'myAppAlertType',
            producer: 'myApp',
            authorizedConsumers: {
              myApp: { read: true, all: true },
            },
          },
        ])
      )
    ).toEqual(
      esKuery.fromKueryExpression(
        `((alert.attributes.alertTypeId:myAppAlertType and alert.attributes.consumer:(myApp)))`
      )
    );
  });

  test('constructs filter for single alert type with multiple authorized consumer', async () => {
    expect(
      asFiltersByAlertTypeAndConsumer(
        new Set([
          {
            actionGroups: [],
            defaultActionGroupId: 'default',
            id: 'myAppAlertType',
            name: 'myAppAlertType',
            producer: 'myApp',
            authorizedConsumers: {
              alerts: { read: true, all: true },
              myApp: { read: true, all: true },
              myOtherApp: { read: true, all: true },
            },
          },
        ])
      )
    ).toEqual(
      esKuery.fromKueryExpression(
        `((alert.attributes.alertTypeId:myAppAlertType and alert.attributes.consumer:(alerts or myApp or myOtherApp)))`
      )
    );
  });

  test('constructs filter for multiple alert types across authorized consumer', async () => {
    expect(
      asFiltersByAlertTypeAndConsumer(
        new Set([
          {
            actionGroups: [],
            defaultActionGroupId: 'default',
            id: 'myAppAlertType',
            name: 'myAppAlertType',
            producer: 'myApp',
            authorizedConsumers: {
              alerts: { read: true, all: true },
              myApp: { read: true, all: true },
              myOtherApp: { read: true, all: true },
              myAppWithSubFeature: { read: true, all: true },
            },
          },
          {
            actionGroups: [],
            defaultActionGroupId: 'default',
            id: 'myOtherAppAlertType',
            name: 'myOtherAppAlertType',
            producer: 'alerts',
            authorizedConsumers: {
              alerts: { read: true, all: true },
              myApp: { read: true, all: true },
              myOtherApp: { read: true, all: true },
              myAppWithSubFeature: { read: true, all: true },
            },
          },
          {
            actionGroups: [],
            defaultActionGroupId: 'default',
            id: 'mySecondAppAlertType',
            name: 'mySecondAppAlertType',
            producer: 'myApp',
            authorizedConsumers: {
              alerts: { read: true, all: true },
              myApp: { read: true, all: true },
              myOtherApp: { read: true, all: true },
              myAppWithSubFeature: { read: true, all: true },
            },
          },
        ])
      )
    ).toEqual(
      esKuery.fromKueryExpression(
        `((alert.attributes.alertTypeId:myAppAlertType and alert.attributes.consumer:(alerts or myApp or myOtherApp or myAppWithSubFeature)) or (alert.attributes.alertTypeId:myOtherAppAlertType and alert.attributes.consumer:(alerts or myApp or myOtherApp or myAppWithSubFeature)) or (alert.attributes.alertTypeId:mySecondAppAlertType and alert.attributes.consumer:(alerts or myApp or myOtherApp or myAppWithSubFeature)))`
      )
    );
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
