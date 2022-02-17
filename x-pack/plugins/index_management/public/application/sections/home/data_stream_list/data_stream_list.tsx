/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  EuiIconTip,
  EuiSpacer,
  EuiPageContent,
  EuiEmptyPrompt,
  EuiLink,
} from '@elastic/eui';
import { ScopedHistory } from 'kibana/public';

import {
  PageLoading,
  PageError,
  Error,
  reactRouterNavigate,
  extractQueryParams,
  attemptToURIDecode,
  APP_WRAPPER_CLASS,
} from '../../../../shared_imports';
import { useAppContext } from '../../../app_context';
import { useLoadDataStreams } from '../../../services/api';
import { documentationService } from '../../../services/documentation';
import { Section } from '../home';
import { DataStreamTable } from './data_stream_table';
import { DataStreamDetailPanel } from './data_stream_detail_panel';
import { filterDataStreams, isSelectedDataStreamHidden } from '../../../lib/data_streams';
import { FilterListButton, Filters } from '../components';

export type DataStreamFilterName = 'managed' | 'hidden';
interface MatchParams {
  dataStreamName?: string;
}

export const DataStreamList: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { dataStreamName },
  },
  location: { search },
  history,
}) => {
  const { isDeepLink, includeHidden } = extractQueryParams(search);
  const decodedDataStreamName = attemptToURIDecode(dataStreamName);

  const {
    core: { getUrlForApp },
    plugins: { isFleetEnabled },
  } = useAppContext();

  const [isIncludeStatsChecked, setIsIncludeStatsChecked] = useState(false);
  const {
    error,
    isLoading,
    data: dataStreams,
    resendRequest: reload,
  } = useLoadDataStreams({
    includeStats: isIncludeStatsChecked,
  });

  const [filters, setFilters] = useState<Filters<DataStreamFilterName>>({
    managed: {
      name: i18n.translate('xpack.idxMgmt.dataStreamList.viewManagedLabel', {
        defaultMessage: 'Fleet-managed data streams',
      }),
      checked: 'on',
    },
    hidden: {
      name: i18n.translate('xpack.idxMgmt.dataStreamList.viewHiddenLabel', {
        defaultMessage: 'Hidden data streams',
      }),
      checked: includeHidden ? 'on' : 'off',
    },
  });

  const activateHiddenFilter = (shouldBeActive: boolean) => {
    if (shouldBeActive && filters.hidden.checked === 'off') {
      setFilters({
        ...filters,
        hidden: {
          ...filters.hidden,
          checked: 'on',
        },
      });
    }
  };

  const filteredDataStreams = useMemo(() => {
    if (!dataStreams) {
      // If dataStreams are not fetched, return empty array.
      return [];
    }

    const visibleTypes = Object.entries(filters)
      .filter(([name, _filter]) => _filter.checked === 'on')
      .map(([name]) => name);

    return filterDataStreams(dataStreams, visibleTypes);
  }, [dataStreams, filters]);

  const renderHeader = () => {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.idxMgmt.dataStreamList.dataStreamsDescription"
              defaultMessage="Data streams store time-series data across multiple indices. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink
                    href={documentationService.getDataStreamsDocumentationLink()}
                    target="_blank"
                    external
                  >
                    {i18n.translate('xpack.idxMgmt.dataStreamListDescription.learnMoreLinkText', {
                      defaultMessage: 'Learn more.',
                    })}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={i18n.translate(
                  'xpack.idxMgmt.dataStreamListControls.includeStatsSwitchLabel',
                  {
                    defaultMessage: 'Include stats',
                  }
                )}
                checked={isIncludeStatsChecked}
                onChange={(e) => setIsIncludeStatsChecked(e.target.checked)}
                data-test-subj="includeStatsSwitch"
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiIconTip
                content={i18n.translate(
                  'xpack.idxMgmt.dataStreamListControls.includeStatsSwitchToolTip',
                  {
                    defaultMessage: 'Including stats can increase reload times',
                  }
                )}
                position="top"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FilterListButton<DataStreamFilterName> filters={filters} onChange={setFilters} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  let content;

  if (isLoading) {
    content = (
      <PageLoading>
        <FormattedMessage
          id="xpack.idxMgmt.dataStreamList.loadingDataStreamsDescription"
          defaultMessage="Loading data streams…"
        />
      </PageLoading>
    );
  } else if (error) {
    content = (
      <PageError
        title={
          <FormattedMessage
            id="xpack.idxMgmt.dataStreamList.loadingDataStreamsErrorMessage"
            defaultMessage="Error loading data streams"
          />
        }
        error={error as Error}
      />
    );
  } else if (Array.isArray(dataStreams) && dataStreams.length === 0) {
    content = (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1 data-test-subj="title">
            <FormattedMessage
              id="xpack.idxMgmt.dataStreamList.emptyPrompt.noDataStreamsTitle"
              defaultMessage="You don't have any data streams yet"
            />
          </h1>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.idxMgmt.dataStreamList.emptyPrompt.noDataStreamsDescription"
              defaultMessage="Data streams store time-series data across multiple indices."
            />
            {' ' /* We need this space to separate these two sentences. */}
            {isFleetEnabled ? (
              <FormattedMessage
                id="xpack.idxMgmt.dataStreamList.emptyPrompt.noDataStreamsCtaIngestManagerMessage"
                defaultMessage="Get started with data streams in {link}."
                values={{
                  link: (
                    <EuiLink
                      data-test-subj="dataStreamsEmptyPromptTemplateLink"
                      href={getUrlForApp('fleet')}
                    >
                      {i18n.translate(
                        'xpack.idxMgmt.dataStreamList.emptyPrompt.noDataStreamsCtaIngestManagerLink',
                        {
                          defaultMessage: 'Fleet',
                        }
                      )}
                    </EuiLink>
                  ),
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.idxMgmt.dataStreamList.emptyPrompt.noDataStreamsCtaIndexTemplateMessage"
                defaultMessage="Get started with data streams by creating a {link}."
                values={{
                  link: (
                    <EuiLink
                      data-test-subj="dataStreamsEmptyPromptTemplateLink"
                      {...reactRouterNavigate(history, {
                        pathname: '/templates',
                      })}
                    >
                      {i18n.translate(
                        'xpack.idxMgmt.dataStreamList.emptyPrompt.noDataStreamsCtaIndexTemplateLink',
                        {
                          defaultMessage: 'composable index template',
                        }
                      )}
                    </EuiLink>
                  ),
                }}
              />
            )}
          </p>
        }
        data-test-subj="emptyPrompt"
      />
    );
  } else {
    activateHiddenFilter(isSelectedDataStreamHidden(dataStreams!, decodedDataStreamName));
    content = (
      <EuiPageContent hasShadow={false} paddingSize="none" data-test-subj="dataStreamList">
        {renderHeader()}
        <EuiSpacer size="l" />

        <DataStreamTable
          filters={
            isDeepLink && decodedDataStreamName !== undefined
              ? `name="${decodedDataStreamName}"`
              : ''
          }
          dataStreams={filteredDataStreams}
          reload={reload}
          history={history as ScopedHistory}
          includeStats={isIncludeStatsChecked}
        />
      </EuiPageContent>
    );
  }

  return (
    <div className={APP_WRAPPER_CLASS}>
      {content}

      {/*
        If the user has been deep-linked, they'll expect to see the detail panel because it reflects
        the URL state, even if there are no data streams or if there was an error loading them.
      */}
      {decodedDataStreamName && (
        <DataStreamDetailPanel
          dataStreamName={decodedDataStreamName}
          onClose={(shouldReload?: boolean) => {
            history.push(`/${Section.DataStreams}`);

            // If the data stream was deleted, we need to refresh the list.
            if (shouldReload) {
              reload();
            }
          }}
        />
      )}
    </div>
  );
};
