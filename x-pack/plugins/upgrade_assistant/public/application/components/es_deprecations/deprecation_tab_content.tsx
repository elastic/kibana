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

import { LoadingErrorBanner } from '../error_banner';
import { GroupByOption, LevelFilterOption, UpgradeAssistantTabProps } from '../types';
import { CheckupControls } from './controls';
import { GroupedDeprecations } from './deprecations/grouped';

export interface CheckupTabProps extends UpgradeAssistantTabProps {
  checkupLabel: string;
}

/**
 * Displays a list of deprecations that filterable and groupable. Can be used for cluster,
 * nodes, or indices checkups.
 */
export const DeprecationTabContent: FunctionComponent<CheckupTabProps> = ({
  checkupLabel,
  deprecations,
  loadingError,
  isLoading,
  refreshCheckupData,
  navigateToOverviewPage,
}) => {
  const [currentFilter, setCurrentFilter] = useState<LevelFilterOption>(LevelFilterOption.all);
  const [search, setSearch] = useState<string>('');
  const [currentGroupBy, setCurrentGroupBy] = useState<GroupByOption>(GroupByOption.message);

  const changeFilter = (filter: LevelFilterOption) => {
    setCurrentFilter(filter);
  };

  const changeSearch = (newSearch: string) => {
    setSearch(newSearch);
  };

  const changeGroupBy = (groupBy: GroupByOption) => {
    setCurrentGroupBy(groupBy);
  };

  const availableGroupByOptions = () => {
    if (!deprecations) {
      return [];
    }

    return Object.keys(GroupByOption).filter((opt) => find(deprecations, opt)) as GroupByOption[];
  };

  const renderCheckupData = () => {
    return (
      <GroupedDeprecations
        currentGroupBy={currentGroupBy}
        currentFilter={currentFilter}
        search={search}
        allDeprecations={deprecations}
      />
    );
  };

  return (
    <>
      <EuiSpacer />

      {loadingError ? (
        <LoadingErrorBanner loadingError={loadingError} />
      ) : deprecations && deprecations.length > 0 ? (
        <div data-test-subj="deprecationsContainer">
          <CheckupControls
            allDeprecations={deprecations}
            isLoading={isLoading}
            loadData={refreshCheckupData}
            currentFilter={currentFilter}
            onFilterChange={changeFilter}
            onSearchChange={changeSearch}
            availableGroupByOptions={availableGroupByOptions()}
            currentGroupBy={currentGroupBy}
            onGroupByChange={changeGroupBy}
          />
          <EuiSpacer />
          {renderCheckupData()}
        </div>
      ) : (
        <EuiEmptyPrompt
          iconType="faceHappy"
          data-test-subj="noDeprecationsPrompt"
          title={
            <h2>
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.noIssues.noIssuesTitle"
                defaultMessage="All clear!"
              />
            </h2>
          }
          body={
            <>
              <p data-test-subj="upgradeAssistantIssueSummary">
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.noIssues.noIssuesLabel"
                  defaultMessage="You have no {strongCheckupLabel} issues."
                  values={{
                    strongCheckupLabel: <strong>{checkupLabel}</strong>,
                  }}
                />
              </p>
              <p>
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.noIssues.nextStepsDetail"
                  defaultMessage="Check the {overviewTabButton} for next steps."
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
      )}
    </>
  );
};
