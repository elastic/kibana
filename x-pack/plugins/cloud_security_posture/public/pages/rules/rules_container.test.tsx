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

const chance = new Chance();

jest.mock('./use_csp_rules', () => ({
  useFindCspRules: jest.fn(),
  useBulkUpdateCspRules: jest.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const getWrapper =
  (): React.FC =>
  ({ children }) =>
    <TestProvider>{children}</TestProvider>;

const getRuleMock = ({ id = chance.guid(), enabled }: { id?: string; enabled: boolean }) =>
  ({
    id,
    updatedAt: chance.date().toISOString(),
    attributes: {
      id,
      name: chance.sentence(),
      enabled,
    },
  } as RuleSavedObject);

describe('<RulesContainer />', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
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
    expect(await screen.findByText(rule1.attributes.name)).toBeInTheDocument();
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
    expect(mutate).toHaveBeenCalledWith([
      { ...rule1.attributes, enabled: !rule1.attributes.enabled },
      { ...rule2.attributes, enabled: !rule2.attributes.enabled },
    ]);
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
    expect(mutate).toHaveBeenCalledWith([
      { ...rule1.attributes, enabled: !rule1.attributes.enabled },
    ]);
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
    expect(mutate).toHaveBeenCalledWith([
      { ...rule1.attributes, enabled: !rule1.attributes.enabled },
      { ...rule4.attributes, enabled: !rule4.attributes.enabled },
      { ...rule5.attributes, enabled: !rule5.attributes.enabled },
    ]);
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
    expect(mutate).toHaveBeenCalledWith([
      { ...rule1.attributes, enabled: !rule1.attributes.enabled },
      { ...rule4.attributes, enabled: !rule4.attributes.enabled },
      { ...rule5.attributes, enabled: !rule5.attributes.enabled },
    ]);
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
    expect(mutate).toHaveBeenCalledWith(
      rules.map((rule) => ({
        ...rule.attributes,
        enabled: !enabled,
      }))
    );
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
    expect(mutate).toHaveBeenCalledWith([{ ...rule.attributes, enabled: !enabled }]);
  });
});
