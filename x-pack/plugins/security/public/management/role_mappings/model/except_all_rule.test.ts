/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AllRule, AnyRule, FieldRule, ExceptAllRule, ExceptAnyRule, RuleGroup } from '.';

describe('Except All rule', () => {
  it('can be constructed without sub rules', () => {
    const rule = new ExceptAllRule();
    expect(rule.getRules()).toHaveLength(0);
  });

  it('can be constructed with sub rules', () => {
    const rule = new ExceptAllRule([new AnyRule()]);
    expect(rule.getRules()).toHaveLength(1);
  });

  it('can accept rules of any type', () => {
    const subRules = [
      new AllRule(),
      new AnyRule(),
      new FieldRule('username', '*'),
      new ExceptAllRule(),
      new ExceptAnyRule(),
    ];

    const rule = new ExceptAllRule() as RuleGroup;
    expect(rule.canContainRules(subRules)).toEqual(true);
    subRules.forEach((sr) => rule.addRule(sr));
    expect(rule.getRules()).toEqual([...subRules]);
  });

  it('can replace an existing rule', () => {
    const rule = new ExceptAllRule([new AnyRule()]);
    const newRule = new FieldRule('username', '*');
    rule.replaceRule(0, newRule);
    expect(rule.getRules()).toEqual([newRule]);
  });

  it('can remove an existing rule', () => {
    const rule = new ExceptAllRule([new AnyRule()]);
    rule.removeRule(0);
    expect(rule.getRules()).toHaveLength(0);
  });

  it('can covert itself into a raw representation', () => {
    const rule = new ExceptAllRule([new AnyRule()]);
    expect(rule.toRaw()).toEqual({
      except: { all: [{ any: [] }] },
    });
  });

  it('can clone itself', () => {
    const subRules = [new AllRule()];
    const rule = new ExceptAllRule(subRules);
    const clone = rule.clone();

    expect(clone.toRaw()).toEqual(rule.toRaw());
    expect(clone.getRules()).toEqual(rule.getRules());
    expect(clone.getRules()).not.toBe(rule.getRules());
  });
});
