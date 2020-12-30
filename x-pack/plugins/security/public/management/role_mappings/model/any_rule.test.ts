/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AllRule, AnyRule, FieldRule, ExceptAllRule, ExceptAnyRule, RuleGroup } from '.';

describe('Any rule', () => {
  it('can be constructed without sub rules', () => {
    const rule = new AnyRule();
    expect(rule.getRules()).toHaveLength(0);
  });

  it('can be constructed with sub rules', () => {
    const rule = new AnyRule([new AllRule()]);
    expect(rule.getRules()).toHaveLength(1);
  });

  it('can accept non-except rules', () => {
    const subRules = [new AllRule(), new AnyRule(), new FieldRule('username', '*')];

    const rule = new AnyRule() as RuleGroup;
    expect(rule.canContainRules(subRules)).toEqual(true);
    subRules.forEach((sr) => rule.addRule(sr));
    expect(rule.getRules()).toEqual([...subRules]);
  });

  it('cannot accept except rules', () => {
    const subRules = [new ExceptAllRule(), new ExceptAnyRule()];

    const rule = new AnyRule() as RuleGroup;
    expect(rule.canContainRules(subRules)).toEqual(false);
  });

  it('can replace an existing rule', () => {
    const rule = new AnyRule([new AllRule()]);
    const newRule = new FieldRule('username', '*');
    rule.replaceRule(0, newRule);
    expect(rule.getRules()).toEqual([newRule]);
  });

  it('can remove an existing rule', () => {
    const rule = new AnyRule([new AllRule()]);
    rule.removeRule(0);
    expect(rule.getRules()).toHaveLength(0);
  });

  it('can covert itself into a raw representation', () => {
    const rule = new AnyRule([new AllRule()]);
    expect(rule.toRaw()).toEqual({
      any: [{ all: [] }],
    });
  });

  it('can clone itself', () => {
    const subRules = [new AllRule()];
    const rule = new AnyRule(subRules);
    const clone = rule.clone();

    expect(clone.toRaw()).toEqual(rule.toRaw());
    expect(clone.getRules()).toEqual(rule.getRules());
    expect(clone.getRules()).not.toBe(rule.getRules());
  });
});
