/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find } from 'lodash';
import React, { FunctionComponent, useState } from 'react';

import {
  EuiCallOut,
  EuiEmptyPrompt,
  EuiLink,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { NEXT_MAJOR_VERSION } from '../../../../../common/version';
import { LoadingErrorBanner } from '../../error_banner';
import { useAppContext } from '../../../app_context';
import {
  GroupByOption,
  LevelFilterOption,
  LoadingState,
  UpgradeAssistantTabProps,
} from '../../types';
import { CheckupControls } from './controls';
import { GroupedDeprecations } from './deprecations/grouped';

export interface CheckupTabProps extends UpgradeAssistantTabProps {
  checkupLabel: string;
  showBackupWarning?: boolean;
}

/**
 * Displays a list of deprecations that filterable and groupable. Can be used for cluster,
 * nodes, or indices checkups.
 */
export const CheckupTab: FunctionComponent<CheckupTabProps> = ({
  alertBanner,
  checkupLabel,
  deprecations,
  loadingError,
  loadingState,
  refreshCheckupData,
  setSelectedTabIndex,
  showBackupWarning = false,
}) => {
  const [currentFilter, setCurrentFilter] = useState<LevelFilterOption>(LevelFilterOption.all);
  const [search, setSearch] = useState<string>('');
  const [currentGroupBy, setCurrentGroupBy] = useState<GroupByOption>(GroupByOption.message);

  const { docLinks } = useAppContext();

  const { DOC_LINK_VERSION, ELASTIC_WEBSITE_URL } = docLinks;
  const esDocBasePath = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}`;

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
      <EuiText grow={false}>
        <p>
          <FormattedMessage
            id="xpack.upgradeAssistant.checkupTab.tabDetail"
            defaultMessage="These {strongCheckupLabel} issues need your attention. Resolve them before upgrading to Elasticsearch {nextEsVersion}."
            values={{
              strongCheckupLabel: <strong>{checkupLabel}</strong>,
              nextEsVersion: `${NEXT_MAJOR_VERSION}.x`,
            }}
          />
        </p>
      </EuiText>

      <EuiSpacer />

      {alertBanner && (
        <>
          {alertBanner}
          <EuiSpacer />
        </>
      )}

      {showBackupWarning && (
        <>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.backUpCallout.calloutTitle"
                defaultMessage="Back up your indices now"
              />
            }
            color="warning"
            iconType="help"
          >
            <p>
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.backUpCallout.calloutBody.calloutDetail"
                defaultMessage="Back up your data using the {snapshotRestoreDocsButton}."
                values={{
                  snapshotRestoreDocsButton: (
                    <EuiLink
                      href={`${esDocBasePath}/snapshot-restore.html`}
                      target="_blank"
                      external
                    >
                      <FormattedMessage
                        id="xpack.upgradeAssistant.checkupTab.backUpCallout.calloutBody.snapshotRestoreDocsButtonLabel"
                        defaultMessage="snapshot and restore APIs"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}

      <EuiPageContent>
        <EuiPageContentBody>
          {loadingState === LoadingState.Error ? (
            <LoadingErrorBanner loadingError={loadingError} />
          ) : deprecations && deprecations.length > 0 ? (
            <>
              <CheckupControls
                allDeprecations={deprecations}
                loadingState={loadingState}
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
            </>
          ) : (
            <EuiEmptyPrompt
              iconType="faceHappy"
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
                          <EuiLink onClick={() => setSelectedTabIndex(0)}>
                            <FormattedMessage
                              id="xpack.upgradeAssistant.checkupTab.noIssues.nextStepsDetail.overviewTabButtonLabel"
                              defaultMessage="Overview tab"
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
        </EuiPageContentBody>
      </EuiPageContent>
    </>
  );
};
