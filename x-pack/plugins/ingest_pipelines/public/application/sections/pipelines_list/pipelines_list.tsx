/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import {
  EuiPageBody,
  EuiPageContent,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiText } from '@elastic/eui';

import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

import { UIM_PIPELINES_LIST_LOAD } from '../../constants';

export const PipelinesList: React.FunctionComponent = () => {
  const { services } = useKibana();

  // Track component loaded
  useEffect(() => {
    services.metric.trackUiMetric(UIM_PIPELINES_LIST_LOAD);
    services.breadcrumbs.setBreadcrumbs('home');
  }, [services]);

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <h1 data-test-subj="appTitle">
                <FormattedMessage
                  id="xpack.ingestPipelines.pipelinesListTitle"
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
                  id="xpack.ingestPipelines.pipelinesListDocsLinkText"
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
              id="xpack.ingestPipelines.pipelinesListDescription"
              defaultMessage="Use ingest node pipelines to pre-process documents before indexing."
            />
          </EuiText>
        </EuiTitle>
      </EuiPageContent>
    </EuiPageBody>
  );
};
