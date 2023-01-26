/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiNotificationBadge,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { DataPanel } from '../../../../shared/data_panel/data_panel';
import { docLinks } from '../../../../shared/doc_links';
import { HttpLogic } from '../../../../shared/http';
import { isManagedPipeline } from '../../../../shared/pipelines/is_managed';

import { IndexViewLogic } from '../index_view_logic';

import { PipelineJSONBadges } from './pipeline_json_badges';
import { IndexPipelinesConfigurationsLogic } from './pipelines_json_configurations_logic';

export const PipelinesJSONConfigurations: React.FC = () => {
  const { http } = useValues(HttpLogic);
  const { ingestionMethod } = useValues(IndexViewLogic);
  const { pipelineNames, selectedPipeline, selectedPipelineId, selectedPipelineJSON } = useValues(
    IndexPipelinesConfigurationsLogic
  );
  const { selectPipeline } = useActions(IndexPipelinesConfigurationsLogic);
  return (
    <>
      <EuiSpacer />
      <DataPanel
        hasBorder
        title={
          <h2>
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.tabs.jsonConfigurations.title',
              { defaultMessage: 'Pipeline configurations' }
            )}
          </h2>
        }
        subtitle={i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.tabs.jsonConfigurations.subtitle',
          { defaultMessage: 'View the JSON for your pipeline configurations on this index.' }
        )}
        footerDocLink={
          <EuiLink href={docLinks.ingestPipelines} target="_blank" color="subdued">
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.tabs.jsonConfigurations.ingestionPipelines.docLink',
              {
                defaultMessage: 'Learn more about how Enterprise Search uses ingest pipelines',
              }
            )}
          </EuiLink>
        }
        action={
          pipelineNames.length > 0 && (
            <EuiNotificationBadge size="m">{pipelineNames.length}</EuiNotificationBadge>
          )
        }
        iconType="visVega"
      >
        <EuiFormRow
          fullWidth
          label={i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.tabs.jsonConfigurations.selectLabel',
            { defaultMessage: 'Select an ingest pipeline to view' }
          )}
        >
          <EuiSelect
            data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-ingestPipelines-selectPipeline`}
            fullWidth
            options={pipelineNames.map((name) => ({ text: name, value: name }))}
            value={selectedPipelineId}
            onChange={(e) => selectPipeline(e.target.value)}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        {selectedPipeline && (
          <>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem>
                <PipelineJSONBadges />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {isManagedPipeline(selectedPipeline) ? (
                  <EuiButtonEmpty
                    data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-ingestPipelines-viewInStackManagement`}
                    size="s"
                    flush="both"
                    iconType="eye"
                    color="primary"
                    href={http.basePath.prepend(
                      `/app/management/ingest/ingest_pipelines/?pipeline=${selectedPipelineId}`
                    )}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.pipelines.tabs.jsonConfigurations.action.view',
                      {
                        defaultMessage: 'View in Stack Management',
                      }
                    )}
                  </EuiButtonEmpty>
                ) : (
                  <EuiButtonEmpty
                    data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-ingestPipelines-editInStackManagement`}
                    size="s"
                    flush="both"
                    iconType="pencil"
                    color="primary"
                    href={http.basePath.prepend(
                      `/app/management/ingest/ingest_pipelines/edit/${selectedPipelineId}`
                    )}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.pipelines.tabs.jsonConfigurations.action.edit',
                      {
                        defaultMessage: 'Edit in Stack Management',
                      }
                    )}
                  </EuiButtonEmpty>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiCodeBlock language="json" overflowHeight={300} isCopyable>
              {selectedPipelineJSON}
            </EuiCodeBlock>
          </>
        )}
      </DataPanel>
    </>
  );
};
