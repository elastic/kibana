/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-shadow */

import * as React from 'react';
import { shallow, mount } from 'enzyme';
import { v4 as uuidv4 } from 'uuid';
import { withBulkRuleOperations, ComponentOpts } from './with_bulk_rule_api_operations';
import { SortField } from '../../../lib/rule_api/load_execution_log_aggregations';
import { Rule } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';

jest.mock('../../../../common/lib/kibana');

jest.mock('../../../lib/rule_api/load_execution_log_aggregations', () => ({
  loadExecutionLogAggregations: jest.fn(),
}));
jest.mock('../../../lib/rule_api/mute', () => ({
  muteRules: jest.fn(),
  muteRule: jest.fn(),
}));
jest.mock('../../../lib/rule_api/unmute', () => ({
  unmuteRules: jest.fn(),
  unmuteRule: jest.fn(),
}));
jest.mock('../../../lib/rule_api/bulk_delete', () => ({
  bulkDeleteRules: jest.fn(),
}));
jest.mock('../../../lib/rule_api/bulk_enable', () => ({
  bulkEnableRules: jest.fn(),
}));
jest.mock('../../../lib/rule_api/bulk_disable', () => ({
  bulkDisableRules: jest.fn(),
}));
jest.mock('../../../lib/rule_api/get_rule', () => ({
  loadRule: jest.fn(),
}));
jest.mock('@kbn/response-ops-rule-form/src/common/apis/resolve_rule', () => ({
  resolveRule: jest.fn(),
}));
jest.mock('../../../lib/rule_api/rule_types', () => ({
  loadRuleTypes: jest.fn(),
}));
jest.mock('../../../lib/rule_api/load_action_error_log', () => ({
  loadActionErrorLog: jest.fn(),
}));

const { loadExecutionLogAggregations } = jest.requireMock(
  '../../../lib/rule_api/load_execution_log_aggregations'
);
const { muteRules, muteRule } = jest.requireMock('../../../lib/rule_api/mute');
const { unmuteRules, unmuteRule } = jest.requireMock('../../../lib/rule_api/unmute');
const { bulkDeleteRules } = jest.requireMock('../../../lib/rule_api/bulk_delete');
const { bulkEnableRules } = jest.requireMock('../../../lib/rule_api/bulk_enable');
const { bulkDisableRules } = jest.requireMock('../../../lib/rule_api/bulk_disable');
const { loadRule } = jest.requireMock('../../../lib/rule_api/get_rule');
const { resolveRule } = jest.requireMock(
  '@kbn/response-ops-rule-form/src/common/apis/resolve_rule'
);
const { loadRuleTypes } = jest.requireMock('../../../lib/rule_api/rule_types');
const { loadActionErrorLog } = jest.requireMock('../../../lib/rule_api/load_action_error_log');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('with_bulk_rule_api_operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extends any component with RuleApi methods', () => {
    const ComponentToExtend = (props: ComponentOpts) => {
      expect(typeof props.muteRules).toEqual('function');
      expect(typeof props.unmuteRules).toEqual('function');
      expect(typeof props.bulkEnableRules).toEqual('function');
      expect(typeof props.bulkDisableRules).toEqual('function');
      expect(typeof props.bulkDeleteRules).toEqual('function');
      expect(typeof props.muteRule).toEqual('function');
      expect(typeof props.unmuteRule).toEqual('function');
      expect(typeof props.loadRule).toEqual('function');
      expect(typeof props.loadRuleTypes).toEqual('function');
      expect(typeof props.resolveRule).toEqual('function');
      expect(typeof props.loadExecutionLogAggregations).toEqual('function');
      return <div />;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    expect(shallow(<ExtendedComponent />).type()).toEqual(ComponentToExtend);
  });

  // single rule
  it('muteRule calls the muteRule api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ muteRule, rule }: ComponentOpts & { rule: Rule }) => {
      return <button onClick={() => muteRule(rule)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rule = mockRule();
    const component = mount(<ExtendedComponent rule={rule} />);
    component.find('button').simulate('click');

    expect(muteRule).toHaveBeenCalledTimes(1);
    expect(muteRule).toHaveBeenCalledWith({ id: rule.id, http });
  });

  it('unmuteRule calls the unmuteRule api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ unmuteRule, rule }: ComponentOpts & { rule: Rule }) => {
      return <button onClick={() => unmuteRule(rule)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rule = mockRule({ muteAll: true });
    const component = mount(<ExtendedComponent rule={rule} />);
    component.find('button').simulate('click');

    expect(unmuteRule).toHaveBeenCalledTimes(1);
    expect(unmuteRule).toHaveBeenCalledWith({ id: rule.id, http });
  });

  it('enableRule calls the muteRules api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ bulkEnableRules, rule }: ComponentOpts & { rule: Rule }) => {
      return <button onClick={() => bulkEnableRules({ ids: [rule.id] })}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rule = mockRule({ enabled: false });
    const component = mount(<ExtendedComponent rule={rule} />);
    component.find('button').simulate('click');

    expect(bulkEnableRules).toHaveBeenCalledTimes(1);
    expect(bulkEnableRules).toHaveBeenCalledWith({ ids: [rule.id], http });
  });

  it('disableRule calls the disableRule api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ bulkDisableRules, rule }: ComponentOpts & { rule: Rule }) => {
      return (
        <button onClick={() => bulkDisableRules({ ids: [rule.id], untrack: true })}>
          {'call api'}
        </button>
      );
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rule = mockRule();
    const component = mount(<ExtendedComponent rule={rule} />);
    component.find('button').simulate('click');

    expect(bulkDisableRules).toHaveBeenCalledTimes(1);
    expect(bulkDisableRules).toHaveBeenCalledWith({ ids: [rule.id], http, untrack: true });
  });

  // bulk rules
  it('muteRules calls the muteRules api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ muteRules, rules }: ComponentOpts & { rules: Rule[] }) => {
      return <button onClick={() => muteRules(rules)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rules = [mockRule(), mockRule()];
    const component = mount(<ExtendedComponent rules={rules} />);
    component.find('button').simulate('click');

    expect(muteRules).toHaveBeenCalledTimes(1);
    expect(muteRules).toHaveBeenCalledWith({ ids: [rules[0].id, rules[1].id], http });
  });

  it('unmuteRules calls the unmuteRules api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ unmuteRules, rules }: ComponentOpts & { rules: Rule[] }) => {
      return <button onClick={() => unmuteRules(rules)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rules = [mockRule({ muteAll: true }), mockRule({ muteAll: true })];
    const component = mount(<ExtendedComponent rules={rules} />);
    component.find('button').simulate('click');

    expect(unmuteRules).toHaveBeenCalledTimes(1);
    expect(unmuteRules).toHaveBeenCalledWith({ ids: [rules[0].id, rules[1].id], http });
  });

  it('enableRules calls the muteRuless api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ bulkEnableRules, rules }: ComponentOpts & { rules: Rule[] }) => {
      return (
        <button onClick={() => bulkEnableRules({ ids: rules.map((rule) => rule.id) })}>
          {'call api'}
        </button>
      );
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rules = [
      mockRule({ enabled: false }),
      mockRule({ enabled: true }),
      mockRule({ enabled: false }),
    ];
    const component = mount(<ExtendedComponent rules={rules} />);
    component.find('button').simulate('click');

    expect(bulkEnableRules).toHaveBeenCalledTimes(1);
    expect(bulkEnableRules).toHaveBeenCalledWith({
      ids: [rules[0].id, rules[1].id, rules[2].id],
      http,
    });
  });

  it('disableRules calls the disableRules api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ bulkDisableRules, rules }: ComponentOpts & { rules: Rule[] }) => {
      return (
        <button
          onClick={() => bulkDisableRules({ ids: rules.map((rule) => rule.id), untrack: true })}
        >
          {'call api'}
        </button>
      );
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rules = [mockRule(), mockRule()];
    const component = mount(<ExtendedComponent rules={rules} />);
    component.find('button').simulate('click');

    expect(bulkDisableRules).toHaveBeenCalledTimes(1);
    expect(bulkDisableRules).toHaveBeenCalledWith({
      ids: [rules[0].id, rules[1].id],
      http,
      untrack: true,
    });
  });

  it('bulkDeleteRules calls the bulkDeleteRules api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ bulkDeleteRules, rules }: ComponentOpts & { rules: Rule[] }) => {
      return (
        <button onClick={() => bulkDeleteRules({ ids: [rules[0].id, rules[1].id] })}>
          {'call api'}
        </button>
      );
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rules = [mockRule(), mockRule()];
    const component = mount(<ExtendedComponent rules={rules} />);
    component.find('button').simulate('click');

    expect(bulkDeleteRules).toHaveBeenCalledTimes(1);
    expect(bulkDeleteRules).toHaveBeenCalledWith({ ids: [rules[0].id, rules[1].id], http });
  });

  it('loadRule calls the loadRule api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ loadRule, ruleId }: ComponentOpts & { ruleId: Rule['id'] }) => {
      return <button onClick={() => loadRule(ruleId)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const ruleId = uuidv4();
    const component = mount(<ExtendedComponent ruleId={ruleId} />);
    component.find('button').simulate('click');

    expect(loadRule).toHaveBeenCalledTimes(1);
    expect(loadRule).toHaveBeenCalledWith({ ruleId, http });
  });

  it('resolveRule calls the resolveRule api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ resolveRule, ruleId }: ComponentOpts & { ruleId: Rule['id'] }) => {
      return <button onClick={() => resolveRule(ruleId)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const ruleId = uuidv4();
    const component = mount(<ExtendedComponent ruleId={ruleId} />);
    component.find('button').simulate('click');

    expect(resolveRule).toHaveBeenCalledTimes(1);
    expect(resolveRule).toHaveBeenCalledWith({ id: ruleId, http });
  });

  it('loadRuleTypes calls the loadRuleTypes api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ loadRuleTypes }: ComponentOpts) => {
      return <button onClick={() => loadRuleTypes()}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const component = mount(<ExtendedComponent />);
    component.find('button').simulate('click');

    expect(loadRuleTypes).toHaveBeenCalledTimes(1);
    expect(loadRuleTypes).toHaveBeenCalledWith({ http });
  });

  it('loadExecutionLogAggregations calls the loadExecutionLogAggregations API', () => {
    const { http } = useKibanaMock().services;

    const sortTimestamp = {
      timestamp: {
        order: 'asc',
      },
    } as SortField;

    const callProps = {
      id: 'test-id',
      dateStart: '2022-03-23T16:17:53.482Z',
      dateEnd: '2022-03-23T16:17:53.482Z',
      filter: ['success', 'unknown'],
      perPage: 10,
      page: 0,
      sort: [sortTimestamp],
    };

    const ComponentToExtend = ({ loadExecutionLogAggregations }: ComponentOpts) => {
      return <button onClick={() => loadExecutionLogAggregations(callProps)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const component = mount(<ExtendedComponent />);
    component.find('button').simulate('click');

    expect(loadExecutionLogAggregations).toHaveBeenCalledTimes(1);
    expect(loadExecutionLogAggregations).toHaveBeenCalledWith({
      ...callProps,
      http,
    });
  });

  it('loadActionErrorLog calls the loadActionErrorLog API', () => {
    const { http } = useKibanaMock().services;
    const callProps = {
      id: 'test-id',
      dateStart: '2022-03-23T16:17:53.482Z',
      dateEnd: '2022-03-23T16:17:53.482Z',
      filter: ['message: "test"'],
      perPage: 10,
      page: 0,
      sort: [
        {
          timestamp: {
            order: 'asc' as const,
          },
        },
      ],
    };

    const ComponentToExtend = ({ loadActionErrorLog }: ComponentOpts) => {
      return <button onClick={() => loadActionErrorLog(callProps)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const component = mount(<ExtendedComponent />);
    component.find('button').simulate('click');

    expect(loadActionErrorLog).toHaveBeenCalledTimes(1);
    expect(loadActionErrorLog).toHaveBeenCalledWith({
      ...callProps,
      http,
    });
  });
});

function mockRule(overloads: Partial<Rule> = {}): Rule {
  return {
    id: uuidv4(),
    enabled: true,
    name: `rule-${uuidv4()}`,
    tags: [],
    ruleTypeId: '.noop',
    consumer: 'consumer',
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
    revision: 0,
    ...overloads,
  };
}
