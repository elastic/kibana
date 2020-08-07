/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { Location } from 'history';
import { parse } from 'query-string';

import {
  EuiPageBody,
  EuiPageContent,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiCallOut,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { Pipeline } from '../../../../common/types';
import { BASE_PATH } from '../../../../common/constants';
import { useKibana, SectionLoading, GlobalFlyout } from '../../../shared_imports';
import { UIM_PIPELINES_LIST_LOAD } from '../../constants';

import { EmptyList } from './empty_list';
import { PipelineTable } from './table';
import {
  PipelineDetailsFlyout,
  Props as PipelineDetailsProps,
  defaultFlyoutProps as pipelineDetailsDefaultProps,
} from './details_flyout';
import { PipelineNotFoundFlyout, Props as PipelineNotFoundProps } from './not_found_flyout';
import { PipelineDeleteModal } from './delete_modal';

const getPipelineNameFromLocation = (location: Location) => {
  const { pipeline } = parse(location.search.substring(1));
  return pipeline;
};

const { useGlobalFlyout } = GlobalFlyout;

export const PipelinesList: React.FunctionComponent<RouteComponentProps> = ({
  history,
  location,
}) => {
  const {
    addContent: addContentToGlobalFlyout,
    removeContent: removeContentFromGlobalFlyout,
  } = useGlobalFlyout();

  const { services } = useKibana();
  const pipelineNameFromLocation = getPipelineNameFromLocation(location);

  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | undefined>(undefined);
  const [showFlyout, setShowFlyout] = useState<boolean>(false);

  const [pipelinesToDelete, setPipelinesToDelete] = useState<string[]>([]);

  const { data, isLoading, error, sendRequest } = services.api.useLoadPipelines();

  const goToEditPipeline = useCallback(
    (name: string) => {
      history.push(`${BASE_PATH}/edit/${encodeURIComponent(name)}`);
    },
    [history]
  );

  const goToClonePipeline = useCallback(
    (name: string) => {
      history.push(`${BASE_PATH}/create/${encodeURIComponent(name)}`);
    },
    [history]
  );

  const goHome = useCallback(() => {
    setShowFlyout(false);
    history.push(BASE_PATH);
  }, [history, setShowFlyout]);

  // Track component loaded
  useEffect(() => {
    services.metric.trackUiMetric(UIM_PIPELINES_LIST_LOAD);
    services.breadcrumbs.setBreadcrumbs('home');
  }, [services.metric, services.breadcrumbs]);

  useEffect(() => {
    if (pipelineNameFromLocation && data?.length) {
      const pipeline = data.find((p) => p.name === pipelineNameFromLocation);
      setSelectedPipeline(pipeline);
      setShowFlyout(true);
    }
  }, [pipelineNameFromLocation, data]);

  useEffect(() => {
    if (showFlyout) {
      if (selectedPipeline) {
        // Open the pipeline details flyout
        addContentToGlobalFlyout<PipelineDetailsProps>({
          id: 'pipelineDetails',
          Component: PipelineDetailsFlyout,
          flyoutProps: {
            ...pipelineDetailsDefaultProps,
            onClose: () => {
              setSelectedPipeline(undefined);
              goHome();
            },
          },
          props: {
            pipeline: selectedPipeline,
            onClose: () => {
              setSelectedPipeline(undefined);
              goHome();
            },
            onEditClick: goToEditPipeline,
            onCloneClick: goToClonePipeline,
            onDeleteClick: setPipelinesToDelete,
          },
        });
      } else {
        // Open the pipeline not found flyout
        addContentToGlobalFlyout<PipelineNotFoundProps>({
          id: 'pipelineNotFound',
          Component: PipelineNotFoundFlyout,
          flyoutProps: {
            onClose: goHome,
          },
          props: {
            pipelineName: pipelineNameFromLocation,
          },
        });
      }
    }
  }, [
    addContentToGlobalFlyout,
    showFlyout,
    selectedPipeline,
    goToEditPipeline,
    goToClonePipeline,
    goHome,
    pipelineNameFromLocation,
  ]);

  useEffect(() => {
    if (!showFlyout) {
      removeContentFromGlobalFlyout('pipelineDetails');
      removeContentFromGlobalFlyout('pipelineNotFound');
    }
  }, [removeContentFromGlobalFlyout, showFlyout]);

  if (data && data.length === 0) {
    return <EmptyList />;
  }

  let content: React.ReactNode;

  if (isLoading) {
    content = (
      <SectionLoading data-test-subj="sectionLoading">
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
        onEditPipelineClick={goToEditPipeline}
        onDeletePipelineClick={setPipelinesToDelete}
        onClonePipelineClick={goToClonePipeline}
        pipelines={data}
      />
    );
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
                    defaultMessage="Ingest Node Pipelines"
                  />
                </h1>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  href={services.documentation.getIngestNodeUrl()}
                  target="_blank"
                  iconType="help"
                  data-test-subj="documentationLink"
                >
                  <FormattedMessage
                    id="xpack.ingestPipelines.list.pipelinesDocsLinkText"
                    defaultMessage="Ingest Node Pipelines docs"
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
                defaultMessage="Define a pipeline for preprocessing documents before indexing."
              />
            </EuiText>
          </EuiTitle>
          <EuiSpacer size="m" />
          {/* Error call out for pipeline table */}
          {error ? (
            <EuiCallOut
              iconType="faceSad"
              color="danger"
              data-test-subj="pipelineLoadError"
              title={
                <FormattedMessage
                  id="xpack.ingestPipelines.list.loadErrorTitle"
                  defaultMessage="Unable to load pipelines. {reloadLink}"
                  values={{
                    reloadLink: (
                      <EuiLink onClick={sendRequest}>
                        <FormattedMessage
                          id="xpack.ingestPipelines.list.loadErrorReloadLinkLabel"
                          defaultMessage="Try again."
                        />
                      </EuiLink>
                    ),
                  }}
                />
              }
            />
          ) : (
            content
          )}
        </EuiPageContent>
      </EuiPageBody>
      {pipelinesToDelete?.length > 0 ? (
        <PipelineDeleteModal
          callback={(deleteResponse) => {
            if (deleteResponse?.hasDeletedPipelines) {
              // reload pipelines list
              sendRequest();
              setSelectedPipeline(undefined);
              goHome();
            }
            setPipelinesToDelete([]);
          }}
          pipelinesToDelete={pipelinesToDelete}
        />
      ) : null}
    </>
  );
};
