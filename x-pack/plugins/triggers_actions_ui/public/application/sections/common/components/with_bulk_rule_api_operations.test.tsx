/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { shallow, mount } from 'enzyme';
import uuid from 'uuid';
import { withBulkRuleOperations, ComponentOpts } from './with_bulk_rule_api_operations';
import * as ruleApi from '../../../lib/rule_api';
import { Rule } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';
jest.mock('../../../../common/lib/kibana');

jest.mock('../../../lib/rule_api');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('with_bulk_rule_api_operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extends any component with RuleApi methods', () => {
    const ComponentToExtend = (props: ComponentOpts) => {
      expect(typeof props.muteRules).toEqual('function');
      expect(typeof props.unmuteRules).toEqual('function');
      expect(typeof props.enableRules).toEqual('function');
      expect(typeof props.disableRules).toEqual('function');
      expect(typeof props.deleteRules).toEqual('function');
      expect(typeof props.muteRule).toEqual('function');
      expect(typeof props.unmuteRule).toEqual('function');
      expect(typeof props.enableRule).toEqual('function');
      expect(typeof props.disableRule).toEqual('function');
      expect(typeof props.deleteRule).toEqual('function');
      expect(typeof props.loadRule).toEqual('function');
      expect(typeof props.loadRuleTypes).toEqual('function');
      expect(typeof props.resolveRule).toEqual('function');
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

    expect(ruleApi.muteRule).toHaveBeenCalledTimes(1);
    expect(ruleApi.muteRule).toHaveBeenCalledWith({ id: rule.id, http });
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

    expect(ruleApi.unmuteRule).toHaveBeenCalledTimes(1);
    expect(ruleApi.unmuteRule).toHaveBeenCalledWith({ id: rule.id, http });
  });

  it('enableRule calls the muteRules api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ enableRule, rule }: ComponentOpts & { rule: Rule }) => {
      return <button onClick={() => enableRule(rule)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rule = mockRule({ enabled: false });
    const component = mount(<ExtendedComponent rule={rule} />);
    component.find('button').simulate('click');

    expect(ruleApi.enableRule).toHaveBeenCalledTimes(1);
    expect(ruleApi.enableRule).toHaveBeenCalledWith({ id: rule.id, http });
  });

  it('disableRule calls the disableRule api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ disableRule, rule }: ComponentOpts & { rule: Rule }) => {
      return <button onClick={() => disableRule(rule)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rule = mockRule();
    const component = mount(<ExtendedComponent rule={rule} />);
    component.find('button').simulate('click');

    expect(ruleApi.disableRule).toHaveBeenCalledTimes(1);
    expect(ruleApi.disableRule).toHaveBeenCalledWith({ id: rule.id, http });
  });

  it('deleteRule calls the deleteRule api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ deleteRule, rule }: ComponentOpts & { rule: Rule }) => {
      return <button onClick={() => deleteRule(rule)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rule = mockRule();
    const component = mount(<ExtendedComponent rule={rule} />);
    component.find('button').simulate('click');

    expect(ruleApi.deleteRules).toHaveBeenCalledTimes(1);
    expect(ruleApi.deleteRules).toHaveBeenCalledWith({ ids: [rule.id], http });
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

    expect(ruleApi.muteRules).toHaveBeenCalledTimes(1);
    expect(ruleApi.muteRules).toHaveBeenCalledWith({ ids: [rules[0].id, rules[1].id], http });
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

    expect(ruleApi.unmuteRules).toHaveBeenCalledTimes(1);
    expect(ruleApi.unmuteRules).toHaveBeenCalledWith({ ids: [rules[0].id, rules[1].id], http });
  });

  it('enableRules calls the muteRuless api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ enableRules, rules }: ComponentOpts & { rules: Rule[] }) => {
      return <button onClick={() => enableRules(rules)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rules = [
      mockRule({ enabled: false }),
      mockRule({ enabled: true }),
      mockRule({ enabled: false }),
    ];
    const component = mount(<ExtendedComponent rules={rules} />);
    component.find('button').simulate('click');

    expect(ruleApi.enableRules).toHaveBeenCalledTimes(1);
    expect(ruleApi.enableRules).toHaveBeenCalledWith({ ids: [rules[0].id, rules[2].id], http });
  });

  it('disableRules calls the disableRules api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ disableRules, rules }: ComponentOpts & { rules: Rule[] }) => {
      return <button onClick={() => disableRules(rules)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rules = [mockRule(), mockRule()];
    const component = mount(<ExtendedComponent rules={rules} />);
    component.find('button').simulate('click');

    expect(ruleApi.disableRules).toHaveBeenCalledTimes(1);
    expect(ruleApi.disableRules).toHaveBeenCalledWith({
      ids: [rules[0].id, rules[1].id],
      http,
    });
  });

  it('deleteRules calls the deleteRules api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ deleteRules, rules }: ComponentOpts & { rules: Rule[] }) => {
      return <button onClick={() => deleteRules(rules)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rules = [mockRule(), mockRule()];
    const component = mount(<ExtendedComponent rules={rules} />);
    component.find('button').simulate('click');

    expect(ruleApi.deleteRules).toHaveBeenCalledTimes(1);
    expect(ruleApi.deleteRules).toHaveBeenCalledWith({ ids: [rules[0].id, rules[1].id], http });
  });

  it('loadRule calls the loadRule api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ loadRule, ruleId }: ComponentOpts & { ruleId: Rule['id'] }) => {
      return <button onClick={() => loadRule(ruleId)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const ruleId = uuid.v4();
    const component = mount(<ExtendedComponent ruleId={ruleId} />);
    component.find('button').simulate('click');

    expect(ruleApi.loadRule).toHaveBeenCalledTimes(1);
    expect(ruleApi.loadRule).toHaveBeenCalledWith({ ruleId, http });
  });

  it('resolveRule calls the resolveRule api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ resolveRule, ruleId }: ComponentOpts & { ruleId: Rule['id'] }) => {
      return <button onClick={() => resolveRule(ruleId)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const ruleId = uuid.v4();
    const component = mount(<ExtendedComponent ruleId={ruleId} />);
    component.find('button').simulate('click');

    expect(ruleApi.resolveRule).toHaveBeenCalledTimes(1);
    expect(ruleApi.resolveRule).toHaveBeenCalledWith({ ruleId, http });
  });

  it('loadRuleTypes calls the loadRuleTypes api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ loadRuleTypes }: ComponentOpts) => {
      return <button onClick={() => loadRuleTypes()}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const component = mount(<ExtendedComponent />);
    component.find('button').simulate('click');

    expect(ruleApi.loadRuleTypes).toHaveBeenCalledTimes(1);
    expect(ruleApi.loadRuleTypes).toHaveBeenCalledWith({ http });
  });
});

function mockRule(overloads: Partial<Rule> = {}): Rule {
  return {
    id: uuid.v4(),
    enabled: true,
    name: `rule-${uuid.v4()}`,
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
    ...overloads,
  };
}
