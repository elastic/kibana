/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { RuleGroup } from './rule_group';
import { Rule } from './rule';

/**
 * Represents a group of rules in which at least one must evaluate to false.
 */
export class ExceptAllRule extends RuleGroup {
  constructor(private rules: Rule[] = []) {
    super();
  }

  /** {@see RuleGroup.getRules} */
  public getRules() {
    return [...this.rules];
  }

  /** {@see RuleGroup.getDisplayTitle} */
  public getDisplayTitle() {
    return i18n.translate('xpack.security.management.editRoleMapping.exceptAllRule.displayTitle', {
      defaultMessage: 'Any are false',
    });
  }

  /** {@see RuleGroup.replaceRule} */
  public replaceRule(ruleIndex: number, rule: Rule) {
    this.rules.splice(ruleIndex, 1, rule);
  }

  /** {@see RuleGroup.removeRule} */
  public removeRule(ruleIndex: number) {
    this.rules.splice(ruleIndex, 1);
  }

  /** {@see RuleGroup.addRule} */
  public addRule(rule: Rule) {
    this.rules.push(rule);
  }

  /** {@see RuleGroup.canContainRules} */
  public canContainRules() {
    return true;
  }

  /** {@see RuleGroup.clone} */
  public clone() {
    return new ExceptAllRule(this.rules.map(r => r.clone()));
  }

  /** {@see RuleGroup.toRaw} */
  public toRaw() {
    const rawRule = {
      all: [...this.rules.map(rule => rule.toRaw())],
    };

    return {
      except: rawRule,
    };
  }
}
