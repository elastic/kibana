/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiBadgeGroup, EuiBadge, EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { DEFAULT_PIPELINE_NAME } from '../../../../../../common/constants';

import { isManagedPipeline } from '../../../../shared/pipelines/is_managed';

import { IndexPipelinesConfigurationsLogic } from './pipelines_json_configurations_logic';

const ManagedPipelineBadge: React.FC = () => (
  <EuiToolTip
    position="top"
    content={i18n.translate(
      'xpack.enterpriseSearch.content.indices.pipelines.tabs.jsonConfigurations.managed.description',
      { defaultMessage: 'This pipeline is managed and cannot be edited' }
    )}
  >
    <EuiBadge iconType="lock" color="warning">
      {i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.tabs.jsonConfigurations.managed',
        { defaultMessage: 'Managed' }
      )}
    </EuiBadge>
  </EuiToolTip>
);

const UnmanagedPipelineBadge: React.FC = () => (
  <EuiToolTip
    position="top"
    content={
      <FormattedMessage
        id="xpack.enterpriseSearch.content.indices.pipelines.tabs.jsonConfigurations.unmanaged.description"
        defaultMessage="Edit this pipeline from {ingestPipelines} in Stack Management"
        values={{
          ingestPipelines: (
            <strong>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.tabs.jsonConfigurations.ingestPipelines',
                { defaultMessage: 'Ingest Pipelines' }
              )}
            </strong>
          ),
        }}
      />
    }
  >
    <EuiBadge iconType="lockOpen">
      {i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.tabs.jsonConfigurations.unmanaged',
        { defaultMessage: 'Unmanaged' }
      )}
    </EuiBadge>
  </EuiToolTip>
);

const SharedPipelineBadge: React.FC = () => (
  <EuiToolTip
    position="top"
    content={i18n.translate(
      'xpack.enterpriseSearch.content.indices.pipelines.tabs.jsonConfigurations.shared.description',
      { defaultMessage: 'This pipeline is shared across all Search ingestion methods' }
    )}
  >
    <EuiBadge iconType="logstashIf" color="hollow">
      {i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.tabs.jsonConfigurations.shared',
        { defaultMessage: 'Shared' }
      )}
    </EuiBadge>
  </EuiToolTip>
);

const IndexPipelineBadge: React.FC = () => (
  <EuiToolTip
    position="top"
    content={i18n.translate(
      'xpack.enterpriseSearch.content.indices.pipelines.tabs.jsonConfigurations.indexSpecific.description',
      { defaultMessage: 'This pipeline contains configurations specific to this index only' }
    )}
  >
    <EuiBadge iconType="document" color="hollow">
      {i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.tabs.jsonConfigurations.indexSpecific',
        { defaultMessage: 'Index specific' }
      )}
    </EuiBadge>
  </EuiToolTip>
);

const MlInferenceBadge: React.FC = () => (
  <EuiToolTip
    position="top"
    content={i18n.translate(
      'xpack.enterpriseSearch.content.indices.pipelines.tabs.jsonConfigurations.mlInference.description',
      {
        defaultMessage:
          'This pipeline references one or more ML Inference Pipelines for this index',
      }
    )}
  >
    <EuiBadge iconType="compute" color="hollow">
      {i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.tabs.jsonConfigurations.mlInference',
        { defaultMessage: 'ML Inference' }
      )}
    </EuiBadge>
  </EuiToolTip>
);

export const PipelineJSONBadges: React.FC = () => {
  const {
    indexName,
    selectedPipeline: pipeline,
    selectedPipelineId: pipelineName,
  } = useValues(IndexPipelinesConfigurationsLogic);
  if (!pipeline) {
    return <></>;
  }
  const badges: JSX.Element[] = [];
  if (isManagedPipeline(pipeline)) {
    badges.push(<ManagedPipelineBadge key="managed-pipeline" />);
  } else {
    badges.push(<UnmanagedPipelineBadge key="unmanaged-pipeline" />);
  }
  if (pipelineName === DEFAULT_PIPELINE_NAME) {
    badges.push(<SharedPipelineBadge key="shared-pipeline" />);
  }
  if (pipelineName?.endsWith('@ml-inference')) {
    badges.push(<MlInferenceBadge key="inference-pipeline" />);
  } else if (pipelineName?.includes(indexName)) {
    badges.push(<IndexPipelineBadge key="index-pipeline" />);
  }
  return <EuiBadgeGroup gutterSize="s">{badges}</EuiBadgeGroup>;
};
