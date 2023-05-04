/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useMemo } from 'react';
import { EuiFlexItem, EuiSwitch } from '@elastic/eui';
import type { Rule } from '../../../../../rule_management/logic/types';

export const LinkRuleSwitch = memo(
  ({
    rule,
    linkedRules,
    onRuleLinkChange,
  }: {
    rule: Rule;
    linkedRules: Rule[];
    onRuleLinkChange: (rulesSelectedToAdd: Rule[]) => void;
  }) => {
    const isRuleLinked = useMemo(
      () => Boolean(linkedRules.find((r) => r.id === rule.id)),
      [linkedRules, rule.id]
    );
    const onLinkOrUnlinkRule = useCallback(
      ({ target: { checked } }) => {
        const newLinkedRules = !checked
          ? linkedRules?.filter((item) => item.id !== rule.id)
          : [...linkedRules, rule];
        if (typeof onRuleLinkChange === 'function') onRuleLinkChange(newLinkedRules);
      },
      [linkedRules, onRuleLinkChange, rule]
    );

    return (
      <EuiFlexItem grow={false}>
        <EuiSwitch onChange={onLinkOrUnlinkRule} label="" checked={isRuleLinked} />
      </EuiFlexItem>
    );
  }
);

LinkRuleSwitch.displayName = 'LinkRuleSwitch';
