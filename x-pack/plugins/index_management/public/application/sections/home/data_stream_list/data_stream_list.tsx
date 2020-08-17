/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiSpacer, EuiEmptyPrompt, EuiLink } from '@elastic/eui';
import { ScopedHistory } from 'kibana/public';

import { reactRouterNavigate, extractQueryParams } from '../../../../shared_imports';
import { useAppContext } from '../../../app_context';
import { SectionError, SectionLoading, Error } from '../../../components';
import { useLoadDataStreams } from '../../../services/api';
import { encodePathForReactRouter, decodePathFromReactRouter } from '../../../services/routing';
import { documentationService } from '../../../services/documentation';
import { Section } from '../../home';
import { DataStreamTable } from './data_stream_table';
import { DataStreamDetailPanel } from './data_stream_detail_panel';

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

  const {
    core: { getUrlForApp },
    plugins: { ingestManager },
  } = useAppContext();

  const { error, isLoading, data: dataStreams, sendRequest: reload } = useLoadDataStreams();

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
            {ingestManager ? (
              <FormattedMessage
                id="xpack.idxMgmt.dataStreamList.emptyPrompt.noDataStreamsCtaIngestManagerMessage"
                defaultMessage="Get started with data streams in {link}."
                values={{
                  link: (
                    <EuiLink
                      data-test-subj="dataStreamsEmptyPromptTemplateLink"
                      href={getUrlForApp('ingestManager')}
                    >
                      {i18n.translate(
                        'xpack.idxMgmt.dataStreamList.emptyPrompt.noDataStreamsCtaIngestManagerLink',
                        {
                          defaultMessage: 'Ingest Manager',
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
    content = (
      <>
        {/* TODO: Add a switch for toggling on data streams created by Ingest Manager */}
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

        <EuiSpacer size="l" />

        <DataStreamTable
          filters={
            isDeepLink && dataStreamName !== undefined
              ? `name=${decodePathFromReactRouter(dataStreamName)}`
              : ''
          }
          dataStreams={dataStreams}
          reload={reload}
          history={history as ScopedHistory}
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
      {dataStreamName && (
        <DataStreamDetailPanel
          dataStreamName={decodePathFromReactRouter(dataStreamName)}
          backingIndicesLink={reactRouterNavigate(history, {
            pathname: '/indices',
            search: `includeHiddenIndices=true&filter=data_stream=${encodePathForReactRouter(
              dataStreamName
            )}`,
          })}
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
