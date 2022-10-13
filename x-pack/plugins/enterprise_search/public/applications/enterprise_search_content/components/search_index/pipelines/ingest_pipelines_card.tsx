/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty,
  EuiAccordion,
  EuiBadge,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../../shared/kibana';

import { LicensingLogic } from '../../../../shared/licensing';
import { CreateCustomPipelineApiLogic } from '../../../api/index/create_custom_pipeline_api_logic';
import { FetchCustomPipelineApiLogic } from '../../../api/index/fetch_custom_pipeline_api_logic';
import { isApiIndex } from '../../../utils/indices';
import { CurlRequest } from '../components/curl_request/curl_request';
import { IndexViewLogic } from '../index_view_logic';

import { CustomPipelinePanel } from './custom_pipeline_panel';
import { IngestPipelineModal } from './ingest_pipeline_modal';
import { PipelinesLogic } from './pipelines_logic';

export const IngestPipelinesCard: React.FC = () => {
  const { indexName, ingestionMethod } = useValues(IndexViewLogic);

  const { canSetPipeline, index, pipelineName, pipelineState, showModal } =
    useValues(PipelinesLogic);
  const { closeModal, openModal, setPipelineState, savePipeline } = useActions(PipelinesLogic);
  const { makeRequest: fetchCustomPipeline } = useActions(FetchCustomPipelineApiLogic);
  const { makeRequest: createCustomPipeline } = useActions(CreateCustomPipelineApiLogic);
  const { data: customPipelines } = useValues(FetchCustomPipelineApiLogic);
  const { isCloud } = useValues(KibanaLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const isGated = !isCloud && !hasPlatinumLicense;
  const customPipeline = customPipelines ? customPipelines[`${indexName}@custom`] : undefined;

  useEffect(() => {
    fetchCustomPipeline({ indexName });
  }, [indexName]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <IngestPipelineModal
        closeModal={closeModal}
        createCustomPipelines={() => createCustomPipeline({ indexName })}
        displayOnly={!canSetPipeline}
        indexName={indexName}
        ingestionMethod={ingestionMethod}
        isGated={isGated}
        isLoading={false}
        pipeline={{ ...pipelineState, name: pipelineName }}
        savePipeline={savePipeline}
        setPipeline={setPipelineState}
        showModal={showModal}
      />
      {customPipeline && (
        <EuiFlexItem>
          <EuiPanel color="primary">
            <CustomPipelinePanel
              indexName={indexName}
              ingestionMethod={ingestionMethod}
              pipelineSuffix="custom"
              processorsCount={customPipeline.processors?.length ?? 0}
            />
          </EuiPanel>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiPanel color="subdued">
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h4>{pipelineName}</h4>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-ingestPipelines-settings`}
                    onClick={openModal}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.pipelines.ingestPipelinesCard.settings.label',
                      { defaultMessage: 'Settings' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup justifyContent="flexEnd">
                {isApiIndex(index) && (
                  <EuiFlexItem>
                    <EuiAccordion
                      data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-ingestPipelines-viewCurlRequest`}
                      buttonContent={i18n.translate(
                        'xpack.enterpriseSearch.content.indices.pipelines.ingestPipelinesCard.accordion.label',
                        { defaultMessage: 'View sample cURL request' }
                      )}
                      id="ingestPipelinesCurlAccordion"
                    >
                      <CurlRequest
                        document={{ body: 'body', title: 'Title' }}
                        indexName={indexName}
                        pipeline={{ ...pipelineState, name: pipelineName }}
                      />
                    </EuiAccordion>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.pipelines.ingestPipelinesCard.managedBadge.label',
                      { defaultMessage: 'Managed' }
                    )}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
