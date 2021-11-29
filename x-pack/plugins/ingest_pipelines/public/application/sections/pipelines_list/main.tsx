/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { Location } from 'history';
import { parse } from 'query-string';

import {
  EuiPageHeader,
  EuiButtonEmpty,
  EuiPageContent,
  EuiEmptyPrompt,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';

import { Pipeline } from '../../../../common/types';
import { useKibana, SectionLoading } from '../../../shared_imports';
import { UIM_PIPELINES_LIST_LOAD } from '../../constants';
import { getEditPath, getClonePath, getListPath } from '../../services/navigation';

import { EmptyList } from './empty_list';
import { PipelineTable } from './table';
import { PipelineDetailsFlyout } from './details_flyout';
import { PipelineNotFoundFlyout } from './not_found_flyout';
import { PipelineDeleteModal } from './delete_modal';

const getPipelineNameFromLocation = (location: Location) => {
  const { pipeline } = parse(location.search.substring(1));
  return pipeline;
};

export const PipelinesList: React.FunctionComponent<RouteComponentProps> = ({
  history,
  location,
}) => {
  const { services } = useKibana();
  const pipelineNameFromLocation = getPipelineNameFromLocation(location);

  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | undefined>(undefined);
  const [showFlyout, setShowFlyout] = useState<boolean>(false);

  const [pipelinesToDelete, setPipelinesToDelete] = useState<string[]>([]);

  const { data, isLoading, error, resendRequest } = services.api.useLoadPipelines();

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

  const goToEditPipeline = (pipelineName: string) => {
    history.push(getEditPath({ pipelineName }));
  };

  const goToClonePipeline = (clonedPipelineName: string) => {
    history.push(getClonePath({ clonedPipelineName }));
  };

  const goHome = () => {
    setShowFlyout(false);
    history.push(getListPath());
  };

  if (error) {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
        <EuiEmptyPrompt
          iconType="alert"
          title={
            <h2 data-test-subj="pipelineLoadError">
              <FormattedMessage
                id="xpack.ingestPipelines.list.loadErrorTitle"
                defaultMessage="Unable to load pipelines"
              />
            </h2>
          }
          body={<p>{error.message}</p>}
          actions={
            <EuiButton onClick={resendRequest} iconType="refresh" color="danger">
              <FormattedMessage
                id="xpack.ingestPipelines.list.loadPipelineReloadButton"
                defaultMessage="Try again"
              />
            </EuiButton>
          }
        />
      </EuiPageContent>
    );
  }

  if (isLoading) {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
        <SectionLoading data-test-subj="sectionLoading">
          <FormattedMessage
            id="xpack.ingestPipelines.list.loadingMessage"
            defaultMessage="Loading pipelines..."
          />
        </SectionLoading>
      </EuiPageContent>
    );
  }

  if (data && data.length === 0) {
    return <EmptyList />;
  }

  const renderFlyout = (): React.ReactNode => {
    if (!showFlyout) {
      return;
    }
    if (selectedPipeline) {
      return (
        <PipelineDetailsFlyout
          pipeline={selectedPipeline}
          onClose={() => {
            setSelectedPipeline(undefined);
            goHome();
          }}
          onEditClick={goToEditPipeline}
          onCloneClick={goToClonePipeline}
          onDeleteClick={setPipelinesToDelete}
        />
      );
    } else {
      // Somehow we triggered show pipeline details, but do not have a pipeline.
      // We assume not found.
      return <PipelineNotFoundFlyout onClose={goHome} pipelineName={pipelineNameFromLocation} />;
    }
  };

  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <span data-test-subj="appTitle">
            <FormattedMessage
              id="xpack.ingestPipelines.list.listTitle"
              defaultMessage="Ingest Pipelines"
            />
          </span>
        }
        description={
          <FormattedMessage
            id="xpack.ingestPipelines.list.pipelinesDescription"
            defaultMessage="Use pipelines to remove or transform fields, extract values from text, and enrich your data before indexing."
          />
        }
        rightSideItems={[
          <EuiButtonEmpty
            href={services.documentation.getIngestNodeUrl()}
            target="_blank"
            iconType="help"
            data-test-subj="documentationLink"
          >
            <FormattedMessage
              id="xpack.ingestPipelines.list.pipelinesDocsLinkText"
              defaultMessage="Ingest Pipelines docs"
            />
          </EuiButtonEmpty>,
        ]}
      />

      <EuiSpacer size="l" />

      <PipelineTable
        onReloadClick={resendRequest}
        onEditPipelineClick={goToEditPipeline}
        onDeletePipelineClick={setPipelinesToDelete}
        onClonePipelineClick={goToClonePipeline}
        pipelines={data as Pipeline[]}
      />

      {renderFlyout()}
      {pipelinesToDelete?.length > 0 ? (
        <PipelineDeleteModal
          callback={(deleteResponse) => {
            if (deleteResponse?.hasDeletedPipelines) {
              // reload pipelines list
              resendRequest();
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
