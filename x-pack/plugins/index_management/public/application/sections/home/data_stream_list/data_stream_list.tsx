/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  EuiIconTip,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiLink,
} from '@elastic/eui';
import { ScopedHistory } from 'kibana/public';

import {
  reactRouterNavigate,
  extractQueryParams,
  attemptToURIDecode,
} from '../../../../shared_imports';
import { useAppContext } from '../../../app_context';
import { SectionError, SectionLoading, Error } from '../../../components';
import { useLoadDataStreams } from '../../../services/api';
import { documentationService } from '../../../services/documentation';
import { Section } from '../home';
import { DataStreamTable } from './data_stream_table';
import { DataStreamDetailPanel } from './data_stream_detail_panel';
import { filterDataStreams } from '../../../lib/data_streams';

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
  const { isDeepLink } = extractQueryParams(search);
  const decodedDataStreamName = attemptToURIDecode(dataStreamName);

  const {
    core: { getUrlForApp },
    plugins: { fleet },
  } = useAppContext();

  const [isIncludeStatsChecked, setIsIncludeStatsChecked] = useState(false);
  const [isIncludeManagedChecked, setIsIncludeManagedChecked] = useState(true);
  const { error, isLoading, data: dataStreams, resendRequest: reload } = useLoadDataStreams({
    includeStats: isIncludeStatsChecked,
  });

  let content;

  if (isLoading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.dataStreamList.loadingDataStreamsDescription"
          defaultMessage="Loading data streams…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <SectionError
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
            {fleet ? (
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
  } else if (Array.isArray(dataStreams) && dataStreams.length > 0) {
    const filteredDataStreams = isIncludeManagedChecked
      ? dataStreams
      : filterDataStreams(dataStreams);
    content = (
      <>
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
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  label={i18n.translate(
                    'xpack.idxMgmt.dataStreamListControls.includeManagedSwitchLabel',
                    {
                      defaultMessage: 'Include Fleet-managed streams',
                    }
                  )}
                  checked={isIncludeManagedChecked}
                  onChange={(e) => setIsIncludeManagedChecked(e.target.checked)}
                  data-test-subj="includeManagedSwitch"
                />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={i18n.translate(
                    'xpack.idxMgmt.dataStreamListControls.includeManagedSwitchToolTip',
                    {
                      defaultMessage: 'Display data streams managed by Fleet',
                    }
                  )}
                  position="top"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

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
      </>
    );
  }

  return (
    <div data-test-subj="dataStreamList">
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
