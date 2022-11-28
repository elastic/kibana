/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useEffect, useState } from 'react';
import { EuiFlexItem, EuiSwitch } from '@elastic/eui';
import type { Rule } from '../../../../../rule_management/logic/types';

export const LinkRuleSwitch = memo(
  ({
    rule,
    initiallySelectedRules,
    onRuleSelectionChange,
  }: {
    rule: Rule;
    initiallySelectedRules?: Rule[];
    onRuleSelectionChange?: (rulesSelectedToAdd: Rule[]) => void;
  }) => {
    const [linkedRules, setLinkedRules] = useState<Rule[]>(initiallySelectedRules || []);

    const [linked, setLinked] = useState<boolean>(false);

    useEffect(() => {
      const isRuleLinked = Boolean(linkedRules.find((r) => r.id === rule.id));
      setLinked(isRuleLinked);

      if (typeof onRuleSelectionChange === 'function') onRuleSelectionChange(linkedRules);
    }, [linkedRules, onRuleSelectionChange, rule.id]);

    const onLinkOrUnlinkRule = useCallback(
      ({ target: { checked } }) => {
        setLinked(checked);

        const newLinkedRules = !checked
          ? linkedRules?.filter((item) => item.id !== rule.id)
          : [...linkedRules, rule];

        setLinkedRules(newLinkedRules);
      },
      [linkedRules, rule]
    );

    return (
      <EuiFlexItem grow={false}>
        <EuiSwitch onChange={onLinkOrUnlinkRule} label="" checked={linked} />
      </EuiFlexItem>
    );
  }
);

LinkRuleSwitch.displayName = 'LinkRuleSwitch';
