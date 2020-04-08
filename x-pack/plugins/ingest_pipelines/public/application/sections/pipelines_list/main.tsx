/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
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
  EuiLoadingSpinner,
} from '@elastic/eui';

import { EuiSpacer, EuiText } from '@elastic/eui';

import { useKibana } from '../../../shared_imports';
import { UIM_PIPELINES_LIST_LOAD } from '../../constants';

import { EmptyList } from './empty_list';
import { PipelineTable } from './table';

export const PipelinesList: React.FunctionComponent = () => {
  const { services } = useKibana();

  // Track component loaded
  useEffect(() => {
    services.metric.trackUiMetric(UIM_PIPELINES_LIST_LOAD);
  }, [services.metric]);

  const { data, isLoading, error } = services.api.useLoadPipelines();

  let content: React.ReactNode;

  if (isLoading) {
    content = (
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  } else if (data?.length) {
    content = (
      <PipelineTable
        onEditPipelineClick={() => {}}
        onDeletePipelineClick={() => {}}
        pipelines={data}
      />
    );
  } else {
    content = <EmptyList onClick={() => {}} />;
  }

  return (
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
        {/* Error call out or pipeline table */}
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
  );
};
