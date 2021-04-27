/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash';
import React, { FunctionComponent, useState } from 'react';

import { EuiEmptyPrompt, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { SectionLoading } from '../../../shared_imports';
import { GroupByOption, LevelFilterOption, UpgradeAssistantTabProps } from '../types';
import { CheckupControls } from './controls';
import { GroupedDeprecations } from './deprecations/grouped';
import { EsDeprecationErrors } from './es_deprecation_errors';

const i18nTexts = {
  isLoading: i18n.translate('xpack.upgradeAssistant.esDeprecations.loadingText', {
    defaultMessage: 'Loading deprecations…',
  }),
};

export interface CheckupTabProps extends UpgradeAssistantTabProps {
  checkupLabel: string;
}

/**
 * Displays a list of deprecations that are filterable and groupable. Can be used for cluster,
 * nodes, or indices deprecations.
 */
export const DeprecationTabContent: FunctionComponent<CheckupTabProps> = ({
  checkupLabel,
  deprecations,
  error,
  isLoading,
  refreshCheckupData,
  navigateToOverviewPage,
}) => {
  const [currentFilter, setCurrentFilter] = useState<LevelFilterOption>(LevelFilterOption.all);
  const [search, setSearch] = useState<string>('');
  const [currentGroupBy, setCurrentGroupBy] = useState<GroupByOption>(GroupByOption.message);

  const availableGroupByOptions = () => {
    if (!deprecations) {
      return [];
    }

    return Object.keys(GroupByOption).filter((opt) => find(deprecations, opt)) as GroupByOption[];
  };

  if (deprecations && deprecations.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="faceHappy"
        data-test-subj="noDeprecationsPrompt"
        title={
          <h2>
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.noIssues.noIssuesTitle"
              defaultMessage="Ready to upgrade!"
            />
          </h2>
        }
        body={
          <>
            <p data-test-subj="upgradeAssistantIssueSummary">
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.noIssues.noIssuesLabel"
                defaultMessage="Your configuration is up to date."
              />
            </p>
            <p>
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.noIssues.nextStepsDetail"
                defaultMessage="Check the {overviewTabButton} for other Stack deprecations."
                values={{
                  overviewTabButton: (
                    <EuiLink onClick={navigateToOverviewPage}>
                      <FormattedMessage
                        id="xpack.upgradeAssistant.checkupTab.noIssues.nextStepsDetail.overviewTabButtonLabel"
                        defaultMessage="Overview page"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </>
        }
      />
    );
  }

  let content: React.ReactNode;

  if (isLoading) {
    content = <SectionLoading>{i18nTexts.isLoading}</SectionLoading>;
  } else if (deprecations?.length) {
    content = (
      <div data-test-subj="deprecationsContainer">
        <CheckupControls
          allDeprecations={deprecations}
          isLoading={isLoading}
          loadData={refreshCheckupData}
          currentFilter={currentFilter}
          onFilterChange={setCurrentFilter}
          onSearchChange={setSearch}
          availableGroupByOptions={availableGroupByOptions()}
          currentGroupBy={currentGroupBy}
          onGroupByChange={setCurrentGroupBy}
        />

        <EuiSpacer />

        <GroupedDeprecations
          currentGroupBy={currentGroupBy}
          currentFilter={currentFilter}
          search={search}
          allDeprecations={deprecations}
        />
      </div>
    );
  } else if (error) {
    content = <EsDeprecationErrors error={error} />;
  }

  return (
    <div data-test-subj={`${checkupLabel}TabContent`}>
      <EuiSpacer />

      {content}
    </div>
  );
};
