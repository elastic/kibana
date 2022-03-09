/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { decompressFromEncodedURIComponent, compressToEncodedURIComponent } from 'lz-string';

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';

import {
  SearchProfilerTabs,
  ProfileTree,
  HighlightDetailsFlyout,
  LicenseWarningNotice,
  ProfileLoadingPlaceholder,
  EmptyTreePlaceHolder,
  ProfileQueryEditor,
} from './components';

import { useAppContext, useProfilerActionContext, useProfilerReadContext } from './contexts';
import { hasAggregations, hasSearch } from './lib';
import { Targets } from './types';

// TODO remove - testing purposes only
const searchQuery = {
  aggs: {
    '0': {
      date_histogram: {
        field: 'timestamp',
        fixed_interval: '3h',
        time_zone: 'America/New_York',
      },
    },
  },
  size: 0,
  fields: [
    {
      field: 'timestamp',
      format: 'date_time',
    },
  ],
  script_fields: {},
  stored_fields: ['*'],
  runtime_mappings: {
    hour_of_day: {
      type: 'long',
      script: {
        source: "emit(doc['timestamp'].value.getHour());",
      },
    },
  },
  _source: {
    excludes: [],
  },
  query: {
    bool: {
      must: [],
      filter: [
        {
          range: {
            timestamp: {
              format: 'strict_date_optional_time',
              gte: '2022-03-02T17:55:35.513Z',
              lte: '2022-03-09T17:55:35.513Z',
            },
          },
        },
      ],
      should: [],
      must_not: [],
    },
  },
};

const testDataUri = compressToEncodedURIComponent(JSON.stringify(searchQuery, null, 2));

console.log('test URI', testDataUri);

export const App = () => {
  const { getLicenseStatus, notifications } = useAppContext();

  const { activeTab, currentResponse, highlightDetails, pristine, profiling } =
    useProfilerReadContext();

  const dispatch = useProfilerActionContext();

  const handleProfileTreeError = (e: Error) => {
    notifications.addError(e, {
      title: i18n.translate('xpack.searchProfiler.profileTreeErrorRenderTitle', {
        defaultMessage: 'Profile data cannot be parsed.',
      }),
    });
  };

  const setActiveTab = useCallback(
    (target: Targets) => dispatch({ type: 'setActiveTab', value: target }),
    [dispatch]
  );

  const onHighlight = useCallback(
    (value) => dispatch({ type: 'setHighlightDetails', value }),
    [dispatch]
  );

  const renderLicenseWarning = () => {
    return !getLicenseStatus().valid ? (
      <>
        <LicenseWarningNotice />
        <EuiSpacer size="s" />
      </>
    ) : null;
  };

  const renderProfileTreeArea = () => {
    if (profiling) {
      return <ProfileLoadingPlaceholder />;
    }

    if (activeTab) {
      return (
        <ProfileTree
          onDataInitError={handleProfileTreeError}
          onHighlight={onHighlight}
          target={activeTab}
          data={currentResponse}
        />
      );
    }

    if (getLicenseStatus().valid && pristine) {
      return <EmptyTreePlaceHolder />;
    }

    return null;
  };

  return (
    <>
      <EuiPage className="prfDevTool__page appRoot">
        <EuiPageBody className="prfDevTool__page__pageBody">
          {renderLicenseWarning()}
          <EuiPageContent className="prfDevTool__page__pageBodyContent">
            <EuiPageContentBody className="prfDevTool__page__pageBodyContentBody">
              <EuiFlexGroup
                responsive={false}
                gutterSize="s"
                direction="row"
                className="prfDevTool__page__bodyGroup"
              >
                <EuiFlexItem>
                  <ProfileQueryEditor />
                </EuiFlexItem>
                <EuiFlexItem grow={3}>
                  <EuiFlexGroup className="prfDevTool__main" gutterSize="none" direction="column">
                    <SearchProfilerTabs
                      activeTab={activeTab}
                      activateTab={setActiveTab}
                      has={{
                        aggregations: Boolean(currentResponse && hasAggregations(currentResponse)),
                        searches: Boolean(currentResponse && hasSearch(currentResponse)),
                      }}
                    />
                    {renderProfileTreeArea()}
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
              {highlightDetails ? (
                <HighlightDetailsFlyout
                  {...highlightDetails}
                  onClose={() => dispatch({ type: 'setHighlightDetails', value: null })}
                />
              ) : null}
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </>
  );
};
