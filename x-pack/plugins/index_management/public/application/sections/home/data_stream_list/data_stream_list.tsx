/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiTitle, EuiText, EuiSpacer, EuiEmptyPrompt, EuiLink } from '@elastic/eui';
import { ScopedHistory } from 'kibana/public';

import { reactRouterNavigate } from '../../../../shared_imports';
import { SectionError, SectionLoading, Error } from '../../../components';
import { useLoadDataStreams } from '../../../services/api';
import { DataStreamTable } from './data_stream_table';

interface MatchParams {
  dataStreamName?: string;
}

export const DataStreamList: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { dataStreamName },
  },
  history,
}) => {
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
              defaultMessage="Data streams represent the latest data in a rollover series. Get started with data streams by creating a {link}."
              values={{
                link: (
                  <EuiLink
                    data-test-subj="dataStreamsEmptyPromptTemplateLink"
                    {...reactRouterNavigate(history, {
                      pathname: '/templates',
                    })}
                  >
                    {i18n.translate('xpack.idxMgmt.dataStreamList.emptyPrompt.getStartedLink', {
                      defaultMessage: 'composable index template',
                    })}
                  </EuiLink>
                ),
              }}
            />
          </p>
        }
        data-test-subj="emptyPrompt"
      />
    );
  } else if (Array.isArray(dataStreams) && dataStreams.length > 0) {
    content = (
      <>
        {/* TODO: Add a switch for toggling on data streams created by Ingest Manager */}
        <EuiTitle size="s">
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.idxMgmt.dataStreamList.dataStreamsDescription"
              defaultMessage="Data streams represent the latest data in a rollover series."
            />
          </EuiText>
        </EuiTitle>

        <EuiSpacer size="l" />

        <DataStreamTable
          filters={dataStreamName !== undefined ? `name=${dataStreamName}` : ''}
          dataStreams={dataStreams}
          reload={reload}
          history={history as ScopedHistory}
        />

        {/* TODO: Implement this once we have something to put in here, e.g. storage size, docs count */}
        {/* dataStreamName && (
          <DataStreamDetailPanel
            dataStreamName={decodePathFromReactRouter(dataStreamName)}
            onClose={() => {
              history.push('/data_streams');
            }}
          />
        )*/}
      </>
    );
  }

  return <div data-test-subj="dataStreamList">{content}</div>;
};
