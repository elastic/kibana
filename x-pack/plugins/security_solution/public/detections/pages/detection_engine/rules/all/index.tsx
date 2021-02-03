/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { SecurityPageName } from '../../../../../app/types';
import { useFormatUrl } from '../../../../../common/components/link_to';
import { CreatePreBuiltRules } from '../../../../containers/detection_engine/rules';
import { RulesTables } from './rules_tables';
import * as i18n from '../translations';
import { ExceptionListsTable } from './exceptions/exceptions_table';

interface AllRulesProps {
  createPrePackagedRules: CreatePreBuiltRules | null;
  hasNoPermissions: boolean;
  loading: boolean;
  loadingCreatePrePackagedRules: boolean;
  refetchPrePackagedRulesStatus: () => Promise<void>;
  rulesCustomInstalled: number | null;
  rulesInstalled: number | null;
  rulesNotInstalled: number | null;
  rulesNotUpdated: number | null;
  setRefreshRulesData: (refreshRule: () => Promise<void>) => void;
}

export enum AllRulesTabs {
  rules = 'rules',
  monitoring = 'monitoring',
  exceptions = 'exceptions',
}

const allRulesTabs = [
  {
    id: AllRulesTabs.rules,
    name: i18n.RULES_TAB,
    disabled: false,
  },
  {
    id: AllRulesTabs.monitoring,
    name: i18n.MONITORING_TAB,
    disabled: false,
  },
  {
    id: AllRulesTabs.exceptions,
    name: i18n.EXCEPTIONS_TAB,
    disabled: false,
  },
];

/**
 * Table Component for displaying all Rules for a given cluster. Provides the ability to filter
 * by name, sort by enabled, and perform the following actions:
 *   * Enable/Disable
 *   * Duplicate
 *   * Delete
 *   * Import/Export
 */
export const AllRules = React.memo<AllRulesProps>(
  ({
    createPrePackagedRules,
    hasNoPermissions,
    loading,
    loadingCreatePrePackagedRules,
    refetchPrePackagedRulesStatus,
    rulesCustomInstalled,
    rulesInstalled,
    rulesNotInstalled,
    rulesNotUpdated,
    setRefreshRulesData,
  }) => {
    const history = useHistory();
    const { formatUrl } = useFormatUrl(SecurityPageName.detections);
    const [allRulesTab, setAllRulesTab] = useState(AllRulesTabs.rules);

    const tabs = useMemo(
      () => (
        <EuiTabs>
          {allRulesTabs.map((tab) => (
            <EuiTab
              data-test-subj={`allRulesTableTab-${tab.id}`}
              onClick={() => setAllRulesTab(tab.id)}
              isSelected={tab.id === allRulesTab}
              disabled={tab.disabled}
              key={tab.id}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
      ),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [allRulesTabs, allRulesTab, setAllRulesTab]
    );

    return (
      <>
        <EuiSpacer />
        {tabs}
        <EuiSpacer />

        {(allRulesTab === AllRulesTabs.rules || allRulesTab === AllRulesTabs.monitoring) && (
          <RulesTables
            history={history}
            formatUrl={formatUrl}
            selectedTab={allRulesTab}
            createPrePackagedRules={createPrePackagedRules}
            hasNoPermissions={hasNoPermissions}
            loading={loading}
            loadingCreatePrePackagedRules={loadingCreatePrePackagedRules}
            refetchPrePackagedRulesStatus={refetchPrePackagedRulesStatus}
            rulesCustomInstalled={rulesCustomInstalled}
            rulesInstalled={rulesInstalled}
            rulesNotInstalled={rulesNotInstalled}
            rulesNotUpdated={rulesNotUpdated}
            setRefreshRulesData={setRefreshRulesData}
          />
        )}
        {allRulesTab === AllRulesTabs.exceptions && (
          <ExceptionListsTable
            formatUrl={formatUrl}
            history={history}
            hasNoPermissions={hasNoPermissions}
            loading={loading}
          />
        )}
      </>
    );
  }
);

AllRules.displayName = 'AllRules';
