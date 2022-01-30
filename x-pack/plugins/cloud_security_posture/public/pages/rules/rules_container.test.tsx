/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RulesContainer } from './rules_container';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useCspRules, type UseCspRulesOptions } from './use_csp_rules';
import * as TEST_SUBJECTS from './test_subjects';
import { Chance } from 'chance';

const chance = new Chance();

jest.mock('./use_csp_rules', () => ({
  useCspRules: jest.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const getWrapper =
  (): React.FC =>
  ({ children }) =>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

const getFakeRule = ({ id = chance.guid(), enabled }: { id?: string; enabled: boolean }) => ({
  id,
  updated_at: chance.date().toISOString(),
  attributes: {
    id,
    name: chance.word(),
    enabled,
  },
});

beforeEach(() => {
  queryClient.clear();
});

describe('<RulesContainer />', () => {
  it('displays rules with their initial state', async () => {
    const Wrapper = getWrapper();
    const rule1 = getFakeRule({ enabled: true });

    (useCspRules as jest.Mock).mockReturnValue({
      bulkUpdateRulesResult: { status: 'idle' },
      rulesResult: {
        status: 'success',
        data: {
          total: 1,
          savedObjects: [rule1],
        },
      },
    });

    render(
      <Wrapper>
        <RulesContainer />
      </Wrapper>
    );

    expect(await screen.getByTestId(TEST_SUBJECTS.CSP_RULES_CONTAINER)).toBeInTheDocument();
    expect(await screen.getByText(rule1.attributes.name)).toBeInTheDocument();
    expect(
      screen
        .getByTestId(TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule1.id))
        .getAttribute('aria-checked')
    ).toEqual('true');
  });

  it('toggles rules locally', () => {
    const Wrapper = getWrapper();
    const rule1 = getFakeRule({ enabled: false });
    const rule2 = getFakeRule({ enabled: true });

    (useCspRules as jest.Mock).mockReturnValue({
      bulkUpdateRulesResult: { status: 'idle' },
      rulesResult: {
        status: 'success',
        data: {
          total: 2,
          savedObjects: [rule1, rule2],
        },
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
    const rule1 = getFakeRule({ enabled: true });
    const rule2 = getFakeRule({ enabled: true });
    const rule3 = getFakeRule({ enabled: false });

    (useCspRules as jest.Mock).mockReturnValue({
      bulkUpdateRulesResult: { status: 'idle' },
      rulesResult: {
        status: 'success',
        data: {
          total: 3,
          savedObjects: [rule1, rule2, rule3],
        },
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
    const rule1 = getFakeRule({ enabled: false });
    const rule2 = getFakeRule({ enabled: true });
    const rule3 = getFakeRule({ enabled: true });

    (useCspRules as jest.Mock).mockReturnValue({
      bulkUpdateRulesResult: { status: 'idle', mutate: jest.fn() },
      rulesResult: {
        status: 'success',
        data: {
          total: 3,
          savedObjects: [rule1, rule2, rule3],
        },
      },
    });

    render(
      <Wrapper>
        <RulesContainer />
      </Wrapper>
    );
    const {
      bulkUpdateRulesResult: { mutate },
    } = useCspRules({} as UseCspRulesOptions);

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
    const rule1 = getFakeRule({ enabled: false });
    const rule2 = getFakeRule({ enabled: true });
    const rule3 = getFakeRule({ enabled: true });

    (useCspRules as jest.Mock).mockReturnValue({
      bulkUpdateRulesResult: { status: 'idle', mutate: jest.fn() },
      rulesResult: {
        status: 'success',
        data: {
          total: 3,
          savedObjects: [rule1, rule2, rule3],
        },
      },
    });

    render(
      <Wrapper>
        <RulesContainer />
      </Wrapper>
    );
    const {
      bulkUpdateRulesResult: { mutate },
    } = useCspRules({} as UseCspRulesOptions);

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
    const rule1 = getFakeRule({ enabled: false });
    const rule2 = getFakeRule({ enabled: true });
    const rule3 = getFakeRule({ enabled: false });
    const rule4 = getFakeRule({ enabled: false });
    const rule5 = getFakeRule({ enabled: true });

    (useCspRules as jest.Mock).mockReturnValue({
      bulkUpdateRulesResult: { status: 'idle', mutate: jest.fn() },
      rulesResult: {
        status: 'success',
        data: {
          total: 4,
          savedObjects: [rule1, rule2, rule3, rule4, rule5],
        },
      },
    });

    render(
      <Wrapper>
        <RulesContainer />
      </Wrapper>
    );
    const {
      bulkUpdateRulesResult: { mutate },
    } = useCspRules({} as UseCspRulesOptions);

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
    const rule1 = getFakeRule({ enabled: false });
    const rule2 = getFakeRule({ enabled: true });
    const rule3 = getFakeRule({ enabled: false });
    const rule4 = getFakeRule({ enabled: false });
    const rule5 = getFakeRule({ enabled: true });

    (useCspRules as jest.Mock).mockReturnValue({
      bulkUpdateRulesResult: { status: 'idle', mutate: jest.fn() },
      rulesResult: {
        status: 'success',
        data: {
          total: 4,
          savedObjects: [rule1, rule2, rule3, rule4, rule5],
        },
      },
    });

    render(
      <Wrapper>
        <RulesContainer />
      </Wrapper>
    );
    const {
      bulkUpdateRulesResult: { mutate },
    } = useCspRules({} as UseCspRulesOptions);

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

  it.skip('discards changes when clicking on refresh button', async () => {
    const Wrapper = getWrapper();
    const rule1 = getFakeRule({ enabled: false });
    const rule2 = getFakeRule({ enabled: true });
    const rule3 = getFakeRule({ enabled: false });

    (useCspRules as jest.Mock).mockReturnValue({
      bulkUpdateRulesResult: { status: 'idle' },
      rulesResult: {
        status: 'success',
        // TODO; refetch needs to.. refetch
        // refetch: jest.fn(),
        // ...actualCspRules.useCspRules({ search: '', searchFields: [''] }).rulesResult,
        data: {
          total: 3,
          savedObjects: [rule1, rule2, rule3],
        },
      },
    });

    render(
      <Wrapper>
        <RulesContainer />
      </Wrapper>
    );

    fireEvent.click(await screen.findByTestId('checkboxSelectAll'));
    fireEvent.click(await screen.findByTestId(TEST_SUBJECTS.CSP_RULES_TABLE_BULK_MENU_BUTTON));
    fireEvent.click(await screen.findByTestId(TEST_SUBJECTS.CSP_RULES_TABLE_BULK_ENABLE_BUTTON));
    fireEvent.click(await screen.findByTestId(TEST_SUBJECTS.CSP_RULES_TABLE_REFRESH_BUTTON));

    const switchId1 = TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule1.id);
    const switchId2 = TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule2.id);
    const switchId3 = TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule3.id);

    await waitFor(async () => {
      expect((await screen.findByTestId(switchId1)).getAttribute('aria-checked')).toEqual(
        rule1.attributes.enabled.toString()
      );
      expect((await screen.findByTestId(switchId2)).getAttribute('aria-checked')).toEqual(
        rule2.attributes.enabled.toString()
      );
      expect((await screen.findByTestId(switchId3)).getAttribute('aria-checked')).toEqual(
        rule3.attributes.enabled.toString()
      );
    });
  });
});
