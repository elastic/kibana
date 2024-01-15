/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { omit } from 'lodash';
import stringify from 'json-stable-stringify';
import {
  EuiSpacer,
  EuiPanel,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiTitle,
  EuiIconTip,
} from '@elastic/eui';
import { parseDuration } from '@kbn/alerting-plugin/common';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schemas.gen';
import { DiffView } from './json_diff/diff_view';
import * as i18n from './json_diff/translations';

const sortAndStringifyJson = (jsObject: Record<string, unknown>): string =>
  stringify(jsObject, { space: 2 });

const HIDDEN_PROPERTIES = [
  /* Not a user-facing property. Can be confused with "version" by users. */
  'revision',

  /* Generates diff when the rule is enabled/disabled by user */
  'enabled',

  /* Never present in prebuilt rule updates. Generates diff if user adds exceptions to installed rule. */
  'exceptions_list',

  /* Not used anymore, but gets defaulted to an empty string when the rule is updated */
  'output_index',

  /* Never present in prebuilt rule updates. Gets added to installed rule after execution. */
  'execution_summary',

  /* Never present in prebuilt rule updates. These get added to installed rule once user saves the rule after editing. */
  'actions',
  'meta',
  'filters',
  'timestamp_override_fallback_disabled',

  /* Not relevant to the upgrade flow until we allow rule customisation. */
  'updated_at',
  'updated_by',
  'created_at',
  'created_by',

  /* Never present in prebuilt rule updates. */
  'outcome',
  'alias_target_id',
  'alias_purpose',
];

interface RuleDiffTabProps {
  oldRule: RuleResponse;
  newRule: RuleResponse;
}

export const RuleDiffTab = ({ oldRule, newRule }: RuleDiffTabProps) => {
  const [oldSource, newSource] = useMemo(() => {
    let oldRuleFrom = oldRule.from;

    if (
      oldRule.from.startsWith('now-') &&
      newRule.from.startsWith('now-') &&
      parseDuration(oldRule.from.slice('now-'.length)) ===
        parseDuration(newRule.from.slice('now-'.length))
    ) {
      /* 
        We want to avoid showing the diff for the `from` property when duration is the same.
        There are cases where different time units are used to represent the same duration.
        For example, `now-1m` and `now-60s` both represent the same duration of 1 minute.
      */
      oldRuleFrom = newRule.from;
    }

    const visibleOldRuleProperties = { ...omit(oldRule, ...HIDDEN_PROPERTIES), from: oldRuleFrom };
    const visibleNewRuleProperties = omit(newRule, ...HIDDEN_PROPERTIES);

    return [
      sortAndStringifyJson(visibleOldRuleProperties),
      sortAndStringifyJson(visibleNewRuleProperties),
    ];
  }, [oldRule, newRule]);

  return (
    <>
      <EuiSpacer size="m" />
      <EuiPanel color="transparent" hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexGroup alignItems="baseline" gutterSize="xs">
            <EuiIconTip
              color="subdued"
              content={i18n.BASE_VERSION_DESCRIPTION}
              type="iInCircle"
              size="m"
              display="block"
            />
            <EuiTitle size="xxxs">
              <h6>{i18n.BASE_VERSION}</h6>
            </EuiTitle>
          </EuiFlexGroup>
          <EuiFlexGroup alignItems="baseline" gutterSize="xs">
            <EuiIconTip
              color="subdued"
              content={i18n.UPDATED_VERSION_DESCRIPTION}
              type="iInCircle"
              size="m"
            />
            <EuiTitle size="xxxs">
              <h6>{i18n.UPDATED_VERSION}</h6>
            </EuiTitle>
          </EuiFlexGroup>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="s" size="full" />
        <DiffView oldSource={oldSource} newSource={newSource} />
      </EuiPanel>
    </>
  );
};
