/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useParams, useHistory, generatePath } from 'react-router-dom';
import type { PageUrlParams } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { benchmarksNavigation } from '../../common/navigation/constants';
import { RulesTable } from './rules_table';
import { RulesTableHeader } from './rules_table_header';
import * as TEST_SUBJECTS from './test_subjects';
import { RuleFlyout } from './rules_flyout';
import { RulesCounters } from './rules_counters';
import { RulesProvider } from './rules_context';

export const RulesContainer = () => {
  const params = useParams<PageUrlParams>();
  const history = useHistory();

  const navToRuleFlyout = (ruleId: string) => {
    history.push(
      generatePath(benchmarksNavigation.rules.path, {
        benchmarkVersion: params.benchmarkVersion,
        benchmarkId: params.benchmarkId,
        ruleId,
      })
    );
  };

  const navToRulePage = () => {
    history.push(
      generatePath(benchmarksNavigation.rules.path, {
        benchmarkVersion: params.benchmarkVersion,
        benchmarkId: params.benchmarkId,
      })
    );
  };

  return (
    <div data-test-subj={TEST_SUBJECTS.CSP_RULES_CONTAINER}>
      <RulesProvider>
        <RulesCounters />
        <EuiSpacer />
        <RulesTableHeader />
        <EuiSpacer />
        <RulesTable selectedRuleId={params.ruleId} onRuleClick={navToRuleFlyout} />
        <RuleFlyout onClose={navToRulePage} />
      </RulesProvider>
    </div>
  );
};
