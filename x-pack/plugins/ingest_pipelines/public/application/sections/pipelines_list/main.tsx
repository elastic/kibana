/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiPageBody,
  EuiPageContent,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiCallOut,
} from '@elastic/eui';

import { EuiSpacer, EuiText } from '@elastic/eui';

import { Pipeline } from '../../../../common/types';
import { BASE_PATH } from '../../../../common/constants';
import { useKibana, SectionLoading } from '../../../shared_imports';
import { UIM_PIPELINES_LIST_LOAD } from '../../constants';

import { EmptyList } from './empty_list';
import { PipelineTable } from './table';
import { PipelineDetails } from './details';
import { PipelineDeleteModal } from './delete_modal';

export const PipelinesList: React.FunctionComponent<RouteComponentProps> = ({ history }) => {
  const { services } = useKibana();

  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | undefined>(undefined);
  const [pipelinesToDelete, setPipelinesToDelete] = useState<string[]>([]);

  // Track component loaded
  useEffect(() => {
    services.metric.trackUiMetric(UIM_PIPELINES_LIST_LOAD);
    services.breadcrumbs.setBreadcrumbs('home');
  }, [services.metric, services.breadcrumbs]);

  const { data, isLoading, error, sendRequest } = services.api.useLoadPipelines();

  let content: React.ReactNode;

  const editPipeline = (name: string) => {
    history.push(encodeURI(`${BASE_PATH}/edit/${encodeURIComponent(name)}`));
  };

  if (isLoading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.ingestPipelines.list.loadingMessage"
          defaultMessage="Loading pipelines..."
        />
      </SectionLoading>
    );
  } else if (data?.length) {
    content = (
      <PipelineTable
        onReloadClick={sendRequest}
        onEditPipelineClick={editPipeline}
        onDeletePipelineClick={setPipelinesToDelete}
        onViewPipelineClick={setSelectedPipeline}
        pipelines={data}
      />
    );
  } else {
    content = <EmptyList />;
  }

  return (
    <>
      <EuiPageBody>
        <EuiPageContent>
          <EuiTitle size="l">
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem>
                <h1 data-test-subj="appTitle">
                  <FormattedMessage
                    id="xpack.ingestPipelines.list.listTitle"
                    defaultMessage="Ingest Pipelines"
                  />
                </h1>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  href={services.documentation.getIngestNodeUrl()}
                  target="_blank"
                  iconType="help"
                >
                  <FormattedMessage
                    id="xpack.ingestPipelines.list.pipelinesDocsLinkText"
                    defaultMessage="Ingest Pipelines docs"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiTitle size="s">
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.ingestPipelines.list.pipelinesDescription"
                defaultMessage="Use ingest node pipelines to pre-process documents before indexing."
              />
            </EuiText>
          </EuiTitle>
          <EuiSpacer size="m" />
          {/* Error call out for pipeline table */}
          {error ? (
            <EuiCallOut
              iconType="faceSad"
              color="danger"
              title={i18n.translate('xpack.ingestPipelines.list.loadErrorTitle', {
                defaultMessage: 'Cannot load pipelines, please refresh the page to try again.',
              })}
            />
          ) : (
            content
          )}
        </EuiPageContent>
      </EuiPageBody>
      {selectedPipeline && (
        <PipelineDetails
          pipeline={selectedPipeline}
          onClose={() => setSelectedPipeline(undefined)}
          onDeleteClick={setPipelinesToDelete}
          onEditClick={editPipeline}
        />
      )}
      {pipelinesToDelete?.length > 0 ? (
        <PipelineDeleteModal
          callback={deleteResponse => {
            if (deleteResponse?.hasDeletedPipelines) {
              // reload pipelines list
              sendRequest();
            }
            setPipelinesToDelete([]);
            setSelectedPipeline(undefined);
          }}
          pipelinesToDelete={pipelinesToDelete}
        />
      ) : null}
    </>
  );
};
