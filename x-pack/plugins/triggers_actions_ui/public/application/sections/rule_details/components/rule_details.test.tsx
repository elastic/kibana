/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import uuid from 'uuid';
import { shallow } from 'enzyme';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from '@testing-library/react';
import { RuleDetails } from './rule_details';
import { Rule, ActionType, RuleTypeModel, RuleType } from '../../../../types';
import { EuiBadge, EuiFlexItem, EuiButtonEmpty, EuiPageHeaderProps } from '@elastic/eui';
import {
  ActionGroup,
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
  ALERTS_FEATURE_ID,
} from '@kbn/alerting-plugin/common';
import { useKibana } from '../../../../common/lib/kibana';
import { ruleTypeRegistryMock } from '../../../rule_type_registry.mock';

export const DATE_9999 = '9999-12-31T12:34:56.789Z';

jest.mock('../../../../common/lib/kibana');

jest.mock('../../../../common/lib/config_api', () => ({
  triggersActionsUiConfig: jest
    .fn()
    .mockResolvedValue({ minimumScheduleInterval: { value: '1m', enforce: false } }),
}));
jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn(),
  }),
  useLocation: () => ({
    pathname: '/triggersActions/rules/',
  }),
}));

jest.mock('../../../lib/action_connector_api', () => ({
  loadAllActions: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../lib/capabilities', () => ({
  hasAllPrivilege: jest.fn(() => true),
  hasSaveRulesCapability: jest.fn(() => true),
  hasExecuteActionsCapability: jest.fn(() => true),
}));
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const ruleTypeRegistry = ruleTypeRegistryMock.create();

const mockRuleApis = {
  muteRule: jest.fn(),
  unmuteRule: jest.fn(),
  enableRule: jest.fn(),
  disableRule: jest.fn(),
  requestRefresh: jest.fn(),
  refreshToken: Date.now(),
  snoozeRule: jest.fn(),
  unsnoozeRule: jest.fn(),
};

const authorizedConsumers = {
  [ALERTS_FEATURE_ID]: { read: true, all: true },
};
const recoveryActionGroup: ActionGroup<'recovered'> = { id: 'recovered', name: 'Recovered' };

const ruleType: RuleType = {
  id: '.noop',
  name: 'No Op',
  actionGroups: [{ id: 'default', name: 'Default' }],
  recoveryActionGroup,
  actionVariables: { context: [], state: [], params: [] },
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  producer: ALERTS_FEATURE_ID,
  authorizedConsumers,
  enabledInLicense: true,
};

describe('rule_details', () => {
  it('renders the rule name as a title', () => {
    const rule = mockRule();
    expect(
      shallow(
        <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
      ).find('EuiPageHeader')
    ).toBeTruthy();
  });

  it('renders the rule type badge', () => {
    const rule = mockRule();
    expect(
      shallow(
        <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
      ).find(<EuiBadge>{ruleType.name}</EuiBadge>)
    ).toBeTruthy();
  });

  it('renders the rule error banner with error message, when rule has a license error', () => {
    const rule = mockRule({
      enabled: true,
      executionStatus: {
        status: 'error',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
        error: {
          reason: RuleExecutionStatusErrorReasons.License,
          message: 'test',
        },
      },
    });
    const wrapper = shallow(
      <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
    );
    expect(wrapper.find('[data-test-subj="ruleErrorBanner"]').first().text()).toMatchInlineSnapshot(
      `"<EuiIcon /> Cannot run rule, test <FormattedMessage />"`
    );
  });

  it('renders the rule warning banner with warning message, when rule status is a warning', () => {
    const rule = mockRule({
      enabled: true,
      executionStatus: {
        status: 'warning',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
        warning: {
          reason: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
          message: 'warning message',
        },
      },
    });
    const wrapper = shallow(
      <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
    );
    expect(
      wrapper.find('[data-test-subj="ruleWarningBanner"]').first().text()
    ).toMatchInlineSnapshot(`"<EuiIcon /> Action limit exceeded warning message"`);
  });

  it('displays a toast message when interval is less than configured minimum', async () => {
    const rule = mockRule({
      schedule: {
        interval: '1s',
      },
    });
    const wrapper = mountWithIntl(
      <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(useKibanaMock().services.notifications.toasts.addInfo).toHaveBeenCalled();
  });

  describe('actions', () => {
    it('renders an rule action', () => {
      const rule = mockRule({
        actions: [
          {
            group: 'default',
            id: uuid.v4(),
            params: {},
            actionTypeId: '.server-log',
          },
        ],
      });

      const actionTypes: ActionType[] = [
        {
          id: '.server-log',
          name: 'Server log',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
        },
      ];

      expect(
        mountWithIntl(
          <RuleDetails
            rule={rule}
            ruleType={ruleType}
            actionTypes={actionTypes}
            {...mockRuleApis}
          />
        ).containsMatchingElement(
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{actionTypes[0].name}</EuiBadge>
          </EuiFlexItem>
        )
      ).toBeTruthy();
    });

    it('renders a counter for multiple rule action', () => {
      const rule = mockRule({
        actions: [
          {
            group: 'default',
            id: uuid.v4(),
            params: {},
            actionTypeId: '.server-log',
          },
          {
            group: 'default',
            id: uuid.v4(),
            params: {},
            actionTypeId: '.email',
          },
        ],
      });
      const actionTypes: ActionType[] = [
        {
          id: '.server-log',
          name: 'Server log',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
        },
        {
          id: '.email',
          name: 'Send email',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
        },
      ];

      const details = mountWithIntl(
        <RuleDetails rule={rule} ruleType={ruleType} actionTypes={actionTypes} {...mockRuleApis} />
      );

      expect(
        details.containsMatchingElement(
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{actionTypes[0].name}</EuiBadge>
          </EuiFlexItem>
        )
      ).toBeTruthy();

      expect(
        details.containsMatchingElement(
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{actionTypes[1].name}</EuiBadge>
          </EuiFlexItem>
        )
      ).toBeTruthy();
    });
  });

  describe('links', () => {
    it('links to the app that created the rule', () => {
      const rule = mockRule();
      expect(
        shallow(
          <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
        ).find('ViewInApp')
      ).toBeTruthy();
    });

    it('links to the Edit flyout', () => {
      const rule = mockRule();
      const pageHeaderProps = shallow(
        <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
      )
        .find('EuiPageHeader')
        .props() as EuiPageHeaderProps;
      const rightSideItems = pageHeaderProps.rightSideItems;
      expect(!!rightSideItems && rightSideItems[2]!).toMatchInlineSnapshot(`
        <React.Fragment>
          <EuiButtonEmpty
            data-test-subj="openEditRuleFlyoutButton"
            disabled={false}
            iconType="pencil"
            name="edit"
            onClick={[Function]}
          >
            <FormattedMessage
              defaultMessage="Edit"
              id="xpack.triggersActionsUI.sections.ruleDetails.editRuleButtonLabel"
              values={Object {}}
            />
          </EuiButtonEmpty>
        </React.Fragment>
      `);
    });
  });
});

describe('disable/enable functionality', () => {
  it('should show that the rule is enabled', () => {
    const rule = mockRule({
      enabled: true,
    });
    const wrapper = mountWithIntl(
      <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
    );
    const actionsElem = wrapper.find('[data-test-subj="statusDropdown"]').first();

    expect(actionsElem.text()).toEqual('Enabled');
  });

  it('should show that the rule is disabled', async () => {
    const rule = mockRule({
      enabled: false,
    });
    const wrapper = mountWithIntl(
      <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
    );
    const actionsElem = wrapper.find('[data-test-subj="statusDropdown"]').first();

    expect(actionsElem.text()).toEqual('Disabled');
  });

  it('should disable the rule when picking disable in the dropdown', async () => {
    const rule = mockRule({
      enabled: true,
    });
    const disableRule = jest.fn();
    const wrapper = mountWithIntl(
      <RuleDetails
        rule={rule}
        ruleType={ruleType}
        actionTypes={[]}
        {...mockRuleApis}
        disableRule={disableRule}
      />
    );
    const actionsElem = wrapper
      .find('[data-test-subj="statusDropdown"] .euiBadge__childButton')
      .first();
    actionsElem.simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await act(async () => {
      const actionsMenuElem = wrapper.find('[data-test-subj="ruleStatusMenu"]');
      const actionsMenuItemElem = actionsMenuElem.first().find('.euiContextMenuItem');
      actionsMenuItemElem.at(1).simulate('click');
      await nextTick();
    });

    expect(disableRule).toHaveBeenCalledTimes(1);
  });

  it('if rule is already disable should do nothing when picking disable in the dropdown', async () => {
    const rule = mockRule({
      enabled: false,
    });
    const disableRule = jest.fn();
    const wrapper = mountWithIntl(
      <RuleDetails
        rule={rule}
        ruleType={ruleType}
        actionTypes={[]}
        {...mockRuleApis}
        disableRule={disableRule}
      />
    );
    const actionsElem = wrapper
      .find('[data-test-subj="statusDropdown"] .euiBadge__childButton')
      .first();
    actionsElem.simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await act(async () => {
      const actionsMenuElem = wrapper.find('[data-test-subj="ruleStatusMenu"]');
      const actionsMenuItemElem = actionsMenuElem.first().find('.euiContextMenuItem');
      actionsMenuItemElem.at(1).simulate('click');
      await nextTick();
    });

    expect(disableRule).toHaveBeenCalledTimes(0);
  });

  it('should enable the rule when picking enable in the dropdown', async () => {
    const rule = mockRule({
      enabled: false,
    });
    const enableRule = jest.fn();
    const wrapper = mountWithIntl(
      <RuleDetails
        rule={rule}
        ruleType={ruleType}
        actionTypes={[]}
        {...mockRuleApis}
        enableRule={enableRule}
      />
    );
    const actionsElem = wrapper
      .find('[data-test-subj="statusDropdown"] .euiBadge__childButton')
      .first();
    actionsElem.simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await act(async () => {
      const actionsMenuElem = wrapper.find('[data-test-subj="ruleStatusMenu"]');
      const actionsMenuItemElem = actionsMenuElem.first().find('.euiContextMenuItem');
      actionsMenuItemElem.at(0).simulate('click');
      await nextTick();
    });

    expect(enableRule).toHaveBeenCalledTimes(1);
  });

  it('if rule is already enable should do nothing when picking enable in the dropdown', async () => {
    const rule = mockRule({
      enabled: true,
    });
    const enableRule = jest.fn();
    const wrapper = mountWithIntl(
      <RuleDetails
        rule={rule}
        ruleType={ruleType}
        actionTypes={[]}
        {...mockRuleApis}
        enableRule={enableRule}
      />
    );
    const actionsElem = wrapper
      .find('[data-test-subj="statusDropdown"] .euiBadge__childButton')
      .first();
    actionsElem.simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await act(async () => {
      const actionsMenuElem = wrapper.find('[data-test-subj="ruleStatusMenu"]');
      const actionsMenuItemElem = actionsMenuElem.first().find('.euiContextMenuItem');
      actionsMenuItemElem.at(0).simulate('click');
      await nextTick();
    });

    expect(enableRule).toHaveBeenCalledTimes(0);
  });

  it('should show the loading spinner when the rule enabled switch was clicked and the server responded with some delay', async () => {
    const rule = mockRule({
      enabled: true,
    });

    const disableRule = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 6000));
    });
    const enableRule = jest.fn();
    const wrapper = mountWithIntl(
      <RuleDetails
        rule={rule}
        ruleType={ruleType}
        actionTypes={[]}
        {...mockRuleApis}
        disableRule={disableRule}
        enableRule={enableRule}
      />
    );

    const actionsElem = wrapper
      .find('[data-test-subj="statusDropdown"] .euiBadge__childButton')
      .first();
    actionsElem.simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await act(async () => {
      const actionsMenuElem = wrapper.find('[data-test-subj="ruleStatusMenu"]');
      const actionsMenuItemElem = actionsMenuElem.first().find('.euiContextMenuItem');
      actionsMenuItemElem.at(1).simulate('click');
    });

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await act(async () => {
      expect(disableRule).toHaveBeenCalled();
      expect(
        wrapper.find('[data-test-subj="statusDropdown"] .euiBadge__childButton .euiLoadingSpinner')
          .length
      ).toBeGreaterThan(0);
    });
  });
});

describe('snooze functionality', () => {
  it('should render "Snooze Indefinitely" when rule is enabled and mute all', () => {
    const rule = mockRule({
      enabled: true,
      muteAll: true,
    });
    const wrapper = mountWithIntl(
      <RuleDetails rule={rule} ruleType={ruleType} actionTypes={[]} {...mockRuleApis} />
    );
    const actionsElem = wrapper
      .find('[data-test-subj="statusDropdown"] .euiBadge__childButton')
      .first();
    expect(actionsElem.text()).toEqual('Snoozed');
    expect(wrapper.find('[data-test-subj="remainingSnoozeTime"]').first().text()).toEqual(
      'Indefinitely'
    );
  });
});

describe('edit button', () => {
  const actionTypes: ActionType[] = [
    {
      id: '.server-log',
      name: 'Server log',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
    },
  ];
  ruleTypeRegistry.has.mockReturnValue(true);
  const ruleTypeR: RuleTypeModel = {
    id: 'my-rule-type',
    iconClass: 'test',
    description: 'Rule when testing',
    documentationUrl: 'https://localhost.local/docs',
    validate: () => {
      return { errors: {} };
    },
    ruleParamsExpression: jest.fn(),
    requiresAppContext: false,
  };
  ruleTypeRegistry.get.mockReturnValue(ruleTypeR);
  useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;

  it('should render an edit button when rule and actions are editable', () => {
    const rule = mockRule({
      enabled: true,
      muteAll: false,
      actions: [
        {
          group: 'default',
          id: uuid.v4(),
          params: {},
          actionTypeId: '.server-log',
        },
      ],
    });
    const pageHeaderProps = shallow(
      <RuleDetails rule={rule} ruleType={ruleType} actionTypes={actionTypes} {...mockRuleApis} />
    )
      .find('EuiPageHeader')
      .props() as EuiPageHeaderProps;
    const rightSideItems = pageHeaderProps.rightSideItems;
    expect(!!rightSideItems && rightSideItems[2]!).toMatchInlineSnapshot(`
      <React.Fragment>
        <EuiButtonEmpty
          data-test-subj="openEditRuleFlyoutButton"
          disabled={false}
          iconType="pencil"
          name="edit"
          onClick={[Function]}
        >
          <FormattedMessage
            defaultMessage="Edit"
            id="xpack.triggersActionsUI.sections.ruleDetails.editRuleButtonLabel"
            values={Object {}}
          />
        </EuiButtonEmpty>
      </React.Fragment>
    `);
  });

  it('should not render an edit button when rule editable but actions arent', () => {
    const { hasExecuteActionsCapability } = jest.requireMock('../../../lib/capabilities');
    hasExecuteActionsCapability.mockReturnValueOnce(false);
    const rule = mockRule({
      enabled: true,
      muteAll: false,
      actions: [
        {
          group: 'default',
          id: uuid.v4(),
          params: {},
          actionTypeId: '.server-log',
        },
      ],
    });
    expect(
      shallow(
        <RuleDetails rule={rule} ruleType={ruleType} actionTypes={actionTypes} {...mockRuleApis} />
      )
        .find(EuiButtonEmpty)
        .find('[name="edit"]')
        .first()
        .exists()
    ).toBeFalsy();
  });

  it('should render an edit button when rule editable but actions arent when there are no actions on the rule', async () => {
    const { hasExecuteActionsCapability } = jest.requireMock('../../../lib/capabilities');
    hasExecuteActionsCapability.mockReturnValueOnce(false);
    const rule = mockRule({
      enabled: true,
      muteAll: false,
      actions: [],
    });
    const pageHeaderProps = shallow(
      <RuleDetails rule={rule} ruleType={ruleType} actionTypes={actionTypes} {...mockRuleApis} />
    )
      .find('EuiPageHeader')
      .props() as EuiPageHeaderProps;
    const rightSideItems = pageHeaderProps.rightSideItems;
    expect(!!rightSideItems && rightSideItems[2]!).toMatchInlineSnapshot(`
      <React.Fragment>
        <EuiButtonEmpty
          data-test-subj="openEditRuleFlyoutButton"
          disabled={false}
          iconType="pencil"
          name="edit"
          onClick={[Function]}
        >
          <FormattedMessage
            defaultMessage="Edit"
            id="xpack.triggersActionsUI.sections.ruleDetails.editRuleButtonLabel"
            values={Object {}}
          />
        </EuiButtonEmpty>
      </React.Fragment>
    `);
  });
});

describe('broken connector indicator', () => {
  const actionTypes: ActionType[] = [
    {
      id: '.server-log',
      name: 'Server log',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
    },
  ];
  ruleTypeRegistry.has.mockReturnValue(true);
  const ruleTypeR: RuleTypeModel = {
    id: 'my-rule-type',
    iconClass: 'test',
    description: 'Rule when testing',
    documentationUrl: 'https://localhost.local/docs',
    validate: () => {
      return { errors: {} };
    },
    ruleParamsExpression: jest.fn(),
    requiresAppContext: false,
  };
  ruleTypeRegistry.get.mockReturnValue(ruleTypeR);
  useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
  const { loadAllActions } = jest.requireMock('../../../lib/action_connector_api');
  loadAllActions.mockResolvedValue([
    {
      secrets: {},
      isMissingSecrets: false,
      id: 'connector-id-1',
      actionTypeId: '.server-log',
      name: 'Test connector',
      config: {},
      isPreconfigured: false,
    },
    {
      secrets: {},
      isMissingSecrets: false,
      id: 'connector-id-2',
      actionTypeId: '.server-log',
      name: 'Test connector 2',
      config: {},
      isPreconfigured: false,
    },
  ]);

  it('should not render broken connector indicator or warning if all rule actions connectors exist', async () => {
    const rule = mockRule({
      enabled: true,
      muteAll: false,
      actions: [
        {
          group: 'default',
          id: 'connector-id-1',
          params: {},
          actionTypeId: '.server-log',
        },
        {
          group: 'default',
          id: 'connector-id-2',
          params: {},
          actionTypeId: '.server-log',
        },
      ],
    });
    const wrapper = mountWithIntl(
      <RuleDetails rule={rule} ruleType={ruleType} actionTypes={actionTypes} {...mockRuleApis} />
    );
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    const brokenConnectorIndicator = wrapper
      .find('[data-test-subj="actionWithBrokenConnector"]')
      .first();
    const brokenConnectorWarningBanner = wrapper
      .find('[data-test-subj="actionWithBrokenConnectorWarningBanner"]')
      .first();
    expect(brokenConnectorIndicator.exists()).toBeFalsy();
    expect(brokenConnectorWarningBanner.exists()).toBeFalsy();
  });

  it('should render broken connector indicator and warning if any rule actions connector does not exist', async () => {
    const rule = mockRule({
      enabled: true,
      muteAll: false,
      actions: [
        {
          group: 'default',
          id: 'connector-id-1',
          params: {},
          actionTypeId: '.server-log',
        },
        {
          group: 'default',
          id: 'connector-id-2',
          params: {},
          actionTypeId: '.server-log',
        },
        {
          group: 'default',
          id: 'connector-id-doesnt-exist',
          params: {},
          actionTypeId: '.server-log',
        },
      ],
    });
    const wrapper = mountWithIntl(
      <RuleDetails rule={rule} ruleType={ruleType} actionTypes={actionTypes} {...mockRuleApis} />
    );
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    const brokenConnectorIndicator = wrapper
      .find('[data-test-subj="actionWithBrokenConnector"]')
      .first();
    const brokenConnectorWarningBanner = wrapper
      .find('[data-test-subj="actionWithBrokenConnectorWarningBanner"]')
      .first();
    const brokenConnectorWarningBannerAction = wrapper
      .find('[data-test-subj="actionWithBrokenConnectorWarningBannerEdit"]')
      .first();
    expect(brokenConnectorIndicator.exists()).toBeTruthy();
    expect(brokenConnectorWarningBanner.exists()).toBeTruthy();
    expect(brokenConnectorWarningBannerAction.exists()).toBeTruthy();
  });

  it('should render broken connector indicator and warning with no edit button if any rule actions connector does not exist and user has no edit access', async () => {
    const rule = mockRule({
      enabled: true,
      muteAll: false,
      actions: [
        {
          group: 'default',
          id: 'connector-id-1',
          params: {},
          actionTypeId: '.server-log',
        },
        {
          group: 'default',
          id: 'connector-id-2',
          params: {},
          actionTypeId: '.server-log',
        },
        {
          group: 'default',
          id: 'connector-id-doesnt-exist',
          params: {},
          actionTypeId: '.server-log',
        },
      ],
    });
    const { hasExecuteActionsCapability } = jest.requireMock('../../../lib/capabilities');
    hasExecuteActionsCapability.mockReturnValue(false);
    const wrapper = mountWithIntl(
      <RuleDetails rule={rule} ruleType={ruleType} actionTypes={actionTypes} {...mockRuleApis} />
    );
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    const brokenConnectorIndicator = wrapper
      .find('[data-test-subj="actionWithBrokenConnector"]')
      .first();
    const brokenConnectorWarningBanner = wrapper
      .find('[data-test-subj="actionWithBrokenConnectorWarningBanner"]')
      .first();
    const brokenConnectorWarningBannerAction = wrapper
      .find('[data-test-subj="actionWithBrokenConnectorWarningBannerEdit"]')
      .first();
    expect(brokenConnectorIndicator.exists()).toBeTruthy();
    expect(brokenConnectorWarningBanner.exists()).toBeTruthy();
    expect(brokenConnectorWarningBannerAction.exists()).toBeFalsy();
  });
});

describe('refresh button', () => {
  it('should call requestRefresh when clicked', async () => {
    const rule = mockRule();
    const requestRefresh = jest.fn();
    const wrapper = mountWithIntl(
      <RuleDetails
        rule={rule}
        ruleType={ruleType}
        actionTypes={[]}
        {...mockRuleApis}
        requestRefresh={requestRefresh}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    const refreshButton = wrapper.find('[data-test-subj="refreshRulesButton"]').first();
    expect(refreshButton.exists()).toBeTruthy();

    refreshButton.simulate('click');
    expect(requestRefresh).toHaveBeenCalledTimes(1);
  });
});

function mockRule(overloads: Partial<Rule> = {}): Rule {
  return {
    id: uuid.v4(),
    enabled: true,
    name: `rule-${uuid.v4()}`,
    tags: [],
    ruleTypeId: '.noop',
    consumer: ALERTS_FEATURE_ID,
    schedule: { interval: '1m' },
    actions: [],
    params: {},
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    apiKeyOwner: null,
    throttle: null,
    notifyWhen: null,
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    ...overloads,
  };
}
