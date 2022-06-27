/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RulesContainer } from './rules_container';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient } from 'react-query';
import { useFindCspRules, useBulkUpdateCspRules, type RuleSavedObject } from './use_csp_rules';
import * as TEST_SUBJECTS from './test_subjects';
import { Chance } from 'chance';
import { TestProvider } from '../../test/test_provider';
import { useParams } from 'react-router-dom';
import { coreMock } from '@kbn/core/public/mocks';

const chance = new Chance();

jest.mock('./use_csp_rules', () => ({
  useFindCspRules: jest.fn(),
  useBulkUpdateCspRules: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const getWrapper =
  ({ canUpdate = true }: { canUpdate: boolean } = { canUpdate: true }): React.FC =>
  ({ children }) => {
    const coreStart = coreMock.createStart();
    const core = {
      ...coreStart,
      application: {
        ...coreStart.application,
        capabilities: {
          ...coreStart.application.capabilities,
          siem: { crud: canUpdate },
        },
      },
    };
    return <TestProvider core={core}>{children}</TestProvider>;
  };

const getRuleMock = ({
  packagePolicyId = chance.guid(),
  policyId = chance.guid(),
  savedObjectId = chance.guid(),
  id = chance.guid(),
  enabled,
}: {
  packagePolicyId?: string;
  policyId?: string;
  savedObjectId?: string;
  id?: string;
  enabled: boolean;
}): RuleSavedObject =>
  ({
    id: savedObjectId,
    updatedAt: chance.date().toISOString(),
    attributes: {
      metadata: {
        audit: chance.sentence(),
        benchmark: {
          name: chance.word(),
          version: chance.sentence(),
        },
        default_value: chance.sentence(),
        description: chance.sentence(),
        id,
        impact: chance.sentence(),
        name: chance.sentence(),
        profile_applicability: chance.sentence(),
        rationale: chance.sentence(),
        references: chance.sentence(),
        rego_rule_id: chance.word(),
        remediation: chance.sentence(),
        section: chance.sentence(),
        tags: [chance.word(), chance.word()],
        version: chance.sentence(),
      },
      package_policy_id: packagePolicyId,
      policy_id: policyId,
      enabled,
      muted: false,
    },
  } as RuleSavedObject);

const getSavedObjectRuleEnable = (
  rule: RuleSavedObject,
  enabled: RuleSavedObject['attributes']['enabled']
) => ({
  ...rule,
  attributes: {
    ...rule.attributes,
    enabled,
  },
});

const params = {
  policyId: chance.guid(),
  packagePolicyId: chance.guid(),
};

describe('<RulesContainer />', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();

    (useParams as jest.Mock).mockReturnValue(params);

    (useBulkUpdateCspRules as jest.Mock).mockReturnValue({
      status: 'idle',
      mutate: jest.fn(),
    });
  });

  it('displays rules with their initial state', async () => {
    const Wrapper = getWrapper();
    const rule1 = getRuleMock({ enabled: true });

    (useFindCspRules as jest.Mock).mockReturnValue({
      status: 'success',
      data: {
        total: 1,
        savedObjects: [rule1],
      },
    });

    render(
      <Wrapper>
        <RulesContainer />
      </Wrapper>
    );

    expect(await screen.findByTestId(TEST_SUBJECTS.CSP_RULES_CONTAINER)).toBeInTheDocument();
    expect(await screen.findByText(rule1.attributes.metadata.name)).toBeInTheDocument();
    expect(
      screen
        .getByTestId(TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule1.id))
        .getAttribute('aria-checked')
    ).toEqual('true');
  });

  it('toggles rules locally', () => {
    const Wrapper = getWrapper();
    const rule1 = getRuleMock({ enabled: false });
    const rule2 = getRuleMock({ enabled: true });

    (useFindCspRules as jest.Mock).mockReturnValue({
      status: 'success',
      data: {
        total: 2,
        savedObjects: [rule1, rule2],
      },
    });

    render(
      <Wrapper>
        <RulesContainer />
      </Wrapper>
    );

    const switchId1 = TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule1.id);
    const switchId2 = TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule2.id);

    expect(screen.getByTestId(switchId1).getAttribute('aria-checked')).toEqual(
      rule1.attributes.enabled.toString()
    );
    expect(screen.getByTestId(switchId2).getAttribute('aria-checked')).toEqual(
      rule2.attributes.enabled.toString()
    );

    fireEvent.click(screen.getByTestId(switchId1));
    fireEvent.click(screen.getByTestId(switchId2));

    expect(screen.getByTestId(switchId1).getAttribute('aria-checked')).toEqual(
      (!rule1.attributes.enabled).toString()
    );
    expect(screen.getByTestId(switchId2).getAttribute('aria-checked')).toEqual(
      (!rule2.attributes.enabled).toString()
    );
  });

  it('bulk toggles rules locally', () => {
    const Wrapper = getWrapper();
    const rule1 = getRuleMock({ enabled: true });
    const rule2 = getRuleMock({ enabled: true });
    const rule3 = getRuleMock({ enabled: false });

    (useFindCspRules as jest.Mock).mockReturnValue({
      status: 'success',
      data: {
        total: 3,
        savedObjects: [rule1, rule2, rule3],
      },
    });

    render(
      <Wrapper>
        <RulesContainer />
      </Wrapper>
    );

    const switchId1 = TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule1.id);
    const switchId2 = TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule2.id);
    const switchId3 = TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule3.id);

    fireEvent.click(screen.getByTestId('checkboxSelectAll'));
    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_TABLE_BULK_MENU_BUTTON));
    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_TABLE_BULK_DISABLE_BUTTON));

    expect(screen.getByTestId(switchId1).getAttribute('aria-checked')).toEqual(
      (!rule1.attributes.enabled).toString()
    );
    expect(screen.getByTestId(switchId2).getAttribute('aria-checked')).toEqual(
      (!rule2.attributes.enabled).toString()
    );
    expect(screen.getByTestId(switchId3).getAttribute('aria-checked')).toEqual(
      rule3.attributes.enabled.toString()
    );
  });

  it('updates rules with local changes done by non-bulk toggles', () => {
    const Wrapper = getWrapper();

    const rule1 = getRuleMock({ enabled: false });
    const rule2 = getRuleMock({ enabled: true });
    const rule3 = getRuleMock({ enabled: true });

    (useFindCspRules as jest.Mock).mockReturnValue({
      status: 'success',
      data: {
        total: 3,
        savedObjects: [rule1, rule2, rule3],
      },
    });

    render(
      <Wrapper>
        <RulesContainer />
      </Wrapper>
    );
    const { mutate } = useBulkUpdateCspRules();

    const switchId1 = TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule1.id);
    const switchId2 = TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule2.id);
    const switchId3 = TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule3.id);

    fireEvent.click(screen.getByTestId(switchId1));
    fireEvent.click(screen.getByTestId(switchId2));
    fireEvent.click(screen.getByTestId(switchId3)); // adds
    fireEvent.click(screen.getByTestId(switchId3)); // removes
    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_SAVE_BUTTON));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({
      packagePolicyId: params.packagePolicyId,
      savedObjectRules: [
        getSavedObjectRuleEnable(rule1, !rule1.attributes.enabled),
        getSavedObjectRuleEnable(rule2, !rule2.attributes.enabled),
      ],
    });
  });

  it('updates rules with local changes done by bulk toggles', () => {
    const Wrapper = getWrapper();
    const rule1 = getRuleMock({ enabled: false });
    const rule2 = getRuleMock({ enabled: true });
    const rule3 = getRuleMock({ enabled: true });

    (useFindCspRules as jest.Mock).mockReturnValue({
      status: 'success',
      data: {
        total: 3,
        savedObjects: [rule1, rule2, rule3],
      },
    });

    render(
      <Wrapper>
        <RulesContainer />
      </Wrapper>
    );
    const { mutate } = useBulkUpdateCspRules();

    fireEvent.click(screen.getByTestId('checkboxSelectAll'));
    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_TABLE_BULK_MENU_BUTTON));
    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_TABLE_BULK_ENABLE_BUTTON)); // This should only change rule1
    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_SAVE_BUTTON));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({
      packagePolicyId: params.packagePolicyId,
      savedObjectRules: [getSavedObjectRuleEnable(rule1, !rule1.attributes.enabled)],
    });
  });

  it('only changes selected rules in bulk operations', () => {
    const Wrapper = getWrapper();
    const rule1 = getRuleMock({ enabled: false });
    const rule2 = getRuleMock({ enabled: true });
    const rule3 = getRuleMock({ enabled: false });
    const rule4 = getRuleMock({ enabled: false });
    const rule5 = getRuleMock({ enabled: true });

    (useFindCspRules as jest.Mock).mockReturnValue({
      status: 'success',
      data: {
        total: 4,
        savedObjects: [rule1, rule2, rule3, rule4, rule5],
      },
    });

    render(
      <Wrapper>
        <RulesContainer />
      </Wrapper>
    );
    const { mutate } = useBulkUpdateCspRules();

    fireEvent.click(screen.getByTestId(`checkboxSelectRow-${rule1.id}`)); // changes
    fireEvent.click(screen.getByTestId(`checkboxSelectRow-${rule2.id}`)); // doesn't change
    fireEvent.click(screen.getByTestId(`checkboxSelectRow-${rule4.id}`)); // changes
    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_TABLE_BULK_MENU_BUTTON));
    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_TABLE_BULK_ENABLE_BUTTON));
    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule5.id))); // changes
    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_SAVE_BUTTON));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({
      packagePolicyId: params.packagePolicyId,
      savedObjectRules: [
        getSavedObjectRuleEnable(rule1, !rule1.attributes.enabled),
        getSavedObjectRuleEnable(rule4, !rule4.attributes.enabled),
        getSavedObjectRuleEnable(rule5, !rule5.attributes.enabled),
      ],
    });
  });

  it('updates rules with changes of both bulk/non-bulk toggles', () => {
    const Wrapper = getWrapper();
    const rule1 = getRuleMock({ enabled: false });
    const rule2 = getRuleMock({ enabled: true });
    const rule3 = getRuleMock({ enabled: false });
    const rule4 = getRuleMock({ enabled: false });
    const rule5 = getRuleMock({ enabled: true });

    (useFindCspRules as jest.Mock).mockReturnValue({
      status: 'success',
      data: {
        total: 4,
        savedObjects: [rule1, rule2, rule3, rule4, rule5],
      },
    });

    render(
      <Wrapper>
        <RulesContainer />
      </Wrapper>
    );

    const { mutate } = useBulkUpdateCspRules();

    fireEvent.click(screen.getByTestId(`checkboxSelectRow-${rule1.id}`)); // changes rule1
    fireEvent.click(screen.getByTestId(`checkboxSelectRow-${rule2.id}`)); // doesn't change
    fireEvent.click(screen.getByTestId(`checkboxSelectRow-${rule4.id}`)); // changes rule4
    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_TABLE_BULK_MENU_BUTTON));
    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_TABLE_BULK_DISABLE_BUTTON)); // changes rule2
    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_TABLE_BULK_ENABLE_BUTTON)); // reverts rule2
    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule5.id))); // changes rule5
    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_SAVE_BUTTON));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({
      packagePolicyId: params.packagePolicyId,
      savedObjectRules: [
        getSavedObjectRuleEnable(rule1, !rule1.attributes.enabled),
        getSavedObjectRuleEnable(rule4, !rule4.attributes.enabled),
        getSavedObjectRuleEnable(rule5, !rule5.attributes.enabled),
      ],
    });
  });

  it('selects and updates all rules', async () => {
    const Wrapper = getWrapper();
    const enabled = true;
    const rules = Array.from({ length: 20 }, () => getRuleMock({ enabled }));

    (useFindCspRules as jest.Mock).mockReturnValue({
      status: 'success',
      data: {
        total: rules.length,
        savedObjects: rules,
      },
    });

    render(
      <Wrapper>
        <RulesContainer />
      </Wrapper>
    );

    const { mutate } = useBulkUpdateCspRules();

    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_TABLE_SELECT_ALL_BUTTON));
    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_TABLE_BULK_MENU_BUTTON));
    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_TABLE_BULK_DISABLE_BUTTON));
    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_SAVE_BUTTON));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({
      packagePolicyId: params.packagePolicyId,
      savedObjectRules: rules.map((rule) =>
        getSavedObjectRuleEnable(rule, !rule.attributes.enabled)
      ),
    });
  });

  it('updates the rules from within the flyout', () => {
    const Wrapper = getWrapper();
    const enabled = true;
    const rules = Array.from({ length: 20 }, () => getRuleMock({ enabled }));

    (useFindCspRules as jest.Mock).mockReturnValue({
      status: 'success',
      data: {
        total: rules.length,
        savedObjects: rules,
      },
    });

    render(
      <Wrapper>
        <RulesContainer />
      </Wrapper>
    );

    const rule = rules[0];
    const rowId = TEST_SUBJECTS.getCspRulesTableRowItemTestId(rule.id);
    const switchId = TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule.id);

    fireEvent.click(screen.getByTestId(rowId)); // open flyout

    const flyout = screen.getByTestId(TEST_SUBJECTS.CSP_RULES_FLYOUT_CONTAINER);

    fireEvent.click(within(flyout).getByTestId(switchId)); // change to !enabled
    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_SAVE_BUTTON)); // save

    const { mutate } = useBulkUpdateCspRules();

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({
      packagePolicyId: params.packagePolicyId,
      savedObjectRules: [getSavedObjectRuleEnable(rule, !rule.attributes.enabled)],
    });
  });

  it("disables rule toggling in table for users without 'crud' ui-capability", async () => {
    const Wrapper = getWrapper({ canUpdate: false });
    const rule1 = getRuleMock({ enabled: true });

    (useFindCspRules as jest.Mock).mockReturnValue({
      status: 'success',
      data: {
        total: 1,
        savedObjects: [rule1],
      },
    });

    render(
      <Wrapper>
        <RulesContainer />
      </Wrapper>
    );

    expect(
      screen.getByTestId(TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule1.id))
    ).toBeDisabled();
  });

  it("disables bulk rule toggling in table for users without 'crud' ui-capability", async () => {
    const Wrapper = getWrapper({ canUpdate: false });
    const rule1 = getRuleMock({ enabled: true });

    (useFindCspRules as jest.Mock).mockReturnValue({
      status: 'success',
      data: {
        total: 1,
        savedObjects: [rule1],
      },
    });

    render(
      <Wrapper>
        <RulesContainer />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_TABLE_BULK_MENU_BUTTON));

    expect(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_TABLE_BULK_ENABLE_BUTTON)).toBeDisabled();
    expect(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_TABLE_BULK_DISABLE_BUTTON)).toBeDisabled();
  });

  it("disables rule toggling in flyout for users without 'crud' ui-capability", async () => {
    const Wrapper = getWrapper({ canUpdate: false });
    const rule1 = getRuleMock({ enabled: true });

    (useFindCspRules as jest.Mock).mockReturnValue({
      status: 'success',
      data: {
        total: 1,
        savedObjects: [rule1],
      },
    });

    render(
      <Wrapper>
        <RulesContainer />
      </Wrapper>
    );

    const rowId = TEST_SUBJECTS.getCspRulesTableRowItemTestId(rule1.id);
    const switchId = TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule1.id);

    fireEvent.click(screen.getByTestId(rowId)); // open flyout

    const flyout = screen.getByTestId(TEST_SUBJECTS.CSP_RULES_FLYOUT_CONTAINER);

    expect(within(flyout).getByTestId(switchId)).toBeDisabled();
  });
});
