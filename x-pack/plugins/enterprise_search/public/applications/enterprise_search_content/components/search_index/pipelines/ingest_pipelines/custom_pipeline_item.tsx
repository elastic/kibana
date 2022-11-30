/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiText, EuiBadge } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EuiButtonEmptyTo } from '../../../../../shared/react_router_helpers';

export const CustomPipelineItem: React.FC<{
  indexName: string;
  ingestionMethod: string;
  pipelineSuffix: string;
  processorsCount: number;
}> = ({ indexName, ingestionMethod, pipelineSuffix, processorsCount }) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>{`${indexName}@${pipelineSuffix}`}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmptyTo
              data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-customPipeline-editPipeline`}
              to={`/app/management/ingest/ingest_pipelines/?pipeline=${indexName}@${pipelineSuffix}`}
              shouldNotCreateHref
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.ingestPipelinesCard.customButtonLabel',
                { defaultMessage: 'Edit pipeline' }
              )}
            </EuiButtonEmptyTo>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiText size="s" color="subdued" grow={false}>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.ingestPipelinesCard.customDescription',
                {
                  defaultMessage: 'Custom ingest pipeline for {indexName}',
                  values: { indexName },
                }
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <span>
              <EuiBadge color="hollow">
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.ingestPipelinesCard.processorsDescription',
                  {
                    defaultMessage: '{processorsCount} Processors',
                    values: { processorsCount },
                  }
                )}
              </EuiBadge>
            </span>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
