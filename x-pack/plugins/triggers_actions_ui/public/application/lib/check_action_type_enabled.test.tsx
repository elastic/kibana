/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionType, PreConfiguredActionConnector } from '../../types';
import {
  checkActionTypeEnabled,
  checkActionFormActionTypeEnabled,
} from './check_action_type_enabled';

describe('checkActionTypeEnabled', () => {
  test(`returns isEnabled:true when action type isn't provided`, async () => {
    expect(checkActionTypeEnabled()).toMatchInlineSnapshot(`
          Object {
            "isEnabled": true,
          }
      `);
  });

  test('returns isEnabled:true when action type is enabled', async () => {
    const actionType: ActionType = {
      id: '1',
      minimumLicenseRequired: 'basic',
      name: 'my action',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
    };
    expect(checkActionTypeEnabled(actionType)).toMatchInlineSnapshot(`
          Object {
            "isEnabled": true,
          }
      `);
  });

  test('returns isEnabled:false when action type is disabled by license', async () => {
    const actionType: ActionType = {
      id: '1',
      minimumLicenseRequired: 'basic',
      name: 'my action',
      enabled: false,
      enabledInConfig: true,
      enabledInLicense: false,
    };
    expect(checkActionTypeEnabled(actionType)).toMatchInlineSnapshot(`
      Object {
        "isEnabled": false,
        "message": "This connector requires a Basic license.",
        "messageCard": <EuiCard
          className="actCheckActionTypeEnabled__disabledActionWarningCard"
          description="To re-enable this action, please upgrade your license."
          title="This feature requires a Basic license."
          titleSize="xs"
        >
          <EuiLink
            href="https://www.elastic.co/subscriptions"
            target="_blank"
          >
            <FormattedMessage
              defaultMessage="View license options"
              id="xpack.triggersActionsUI.licenseCheck.actionTypeDisabledByLicenseLinkTitle"
              values={Object {}}
            />
          </EuiLink>
        </EuiCard>,
      }
    `);
  });

  test('returns isEnabled:false when action type is disabled by config', async () => {
    const actionType: ActionType = {
      id: '1',
      minimumLicenseRequired: 'basic',
      name: 'my action',
      enabled: false,
      enabledInConfig: false,
      enabledInLicense: true,
    };
    expect(checkActionTypeEnabled(actionType)).toMatchInlineSnapshot(`
          Object {
            "isEnabled": false,
            "message": "This connector is disabled by the Kibana configuration.",
            "messageCard": <EuiCard
              className="actCheckActionTypeEnabled__disabledActionWarningCard"
              description=""
              title="This feature is disabled by the Kibana configuration."
            />,
          }
      `);
  });
});

describe('checkActionFormActionTypeEnabled', () => {
  const preconfiguredConnectors: PreConfiguredActionConnector[] = [
    {
      actionTypeId: '1',
      id: 'test1',
      isPreconfigured: true,
      isDeprecated: true,
      name: 'test',
      referencedByCount: 0,
    },
    {
      actionTypeId: '2',
      id: 'test2',
      isPreconfigured: true,
      isDeprecated: true,
      name: 'test',
      referencedByCount: 0,
    },
  ];

  test('returns isEnabled:true when action type is preconfigured', async () => {
    const actionType: ActionType = {
      id: '1',
      minimumLicenseRequired: 'basic',
      name: 'my action',
      enabled: true,
      enabledInConfig: false,
      enabledInLicense: true,
    };

    expect(checkActionFormActionTypeEnabled(actionType, preconfiguredConnectors))
      .toMatchInlineSnapshot(`
          Object {
            "isEnabled": true,
          }
      `);
  });

  test('returns isEnabled:false when action type is disabled by config and not preconfigured', async () => {
    const actionType: ActionType = {
      id: 'disabled-by-config',
      minimumLicenseRequired: 'basic',
      name: 'my action',
      enabled: true,
      enabledInConfig: false,
      enabledInLicense: true,
    };
    expect(checkActionFormActionTypeEnabled(actionType, preconfiguredConnectors))
      .toMatchInlineSnapshot(`
          Object {
            "isEnabled": false,
            "message": "This connector is disabled by the Kibana configuration.",
            "messageCard": <EuiCard
              className="actCheckActionTypeEnabled__disabledActionWarningCard"
              description=""
              title="This feature is disabled by the Kibana configuration."
            />,
          }
      `);
  });
});
