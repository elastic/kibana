/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiButtonEmpty, EuiConfirmModal, EuiFlexGroup, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../../common/types/api';

import { CANCEL_BUTTON_LABEL } from '../../../../../shared/constants';

import { KibanaLogic } from '../../../../../shared/kibana';
import { LicensingLogic } from '../../../../../shared/licensing';
import { CreateCustomPipelineApiLogic } from '../../../../api/index/create_custom_pipeline_api_logic';

import { RevertConnectorPipelineApilogic } from '../../../../api/pipelines/revert_connector_pipeline_api_logic';
import { IndexViewLogic } from '../../index_view_logic';
import { PipelinesLogic } from '../pipelines_logic';

export const CustomizeIngestPipelineItem: React.FC = () => {
  const { indexName, ingestionMethod } = useValues(IndexViewLogic);
  const { isCloud } = useValues(KibanaLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { makeRequest: createCustomPipeline } = useActions(CreateCustomPipelineApiLogic);
  const { status: createStatus } = useValues(CreateCustomPipelineApiLogic);
  const { isDeleteModalOpen, hasIndexIngestionPipeline } = useValues(PipelinesLogic);
  const { closeDeleteModal, openDeleteModal } = useActions(PipelinesLogic);
  const { makeRequest: revertPipeline } = useActions(RevertConnectorPipelineApilogic);
  const { status: revertStatus } = useValues(RevertConnectorPipelineApilogic);
  const isGated = !isCloud && !hasPlatinumLicense;

  return (
    <>
      {isGated ? (
        <EuiText color="subdued" size="s" grow={false}>
          {i18n.translate(
            'xpack.enterpriseSearch.content.index.pipelines.copyAndCustomize.platinumText',
            {
              defaultMessage:
                'With a platinum license, you can create an index-specific version of this configuration and modify it for your use case.',
            }
          )}
        </EuiText>
      ) : (
        <EuiText color="subdued" size="s" grow={false}>
          {i18n.translate(
            'xpack.enterpriseSearch.content.index.pipelines.copyAndCustomize.description',
            {
              defaultMessage:
                'You can create an index-specific version of this configuration and modify it for your use case.',
            }
          )}
        </EuiText>
      )}
      <EuiFlexGroup justifyContent="flexEnd">
        {isDeleteModalOpen && (
          <EuiConfirmModal
            title={i18n.translate(
              'xpack.enterpriseSearch.content.index.pipelines.deleteModal.title',
              {
                defaultMessage: 'Delete custom pipeline',
              }
            )}
            isLoading={revertStatus === Status.LOADING}
            onCancel={closeDeleteModal}
            onConfirm={() => revertPipeline({ indexName })}
            cancelButtonText={CANCEL_BUTTON_LABEL}
            confirmButtonText={i18n.translate(
              'xpack.enterpriseSearch.content.index.pipelines.deleteModal.confirmButton',
              {
                defaultMessage: 'Delete pipeline',
              }
            )}
            buttonColor="danger"
          >
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.content.index.pipelines.deleteModal.description',
                {
                  defaultMessage:
                    'This will delete any custom pipelines associated with this index, including machine learning inference pipelines. The index will revert to using the default ingest pipeline.',
                }
              )}
            </p>
          </EuiConfirmModal>
        )}
        {hasIndexIngestionPipeline ? (
          <EuiButtonEmpty
            data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-ingestPipelines-revertPipeline`}
            onClick={() => openDeleteModal()}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.index.pipelines.ingestFlyout.revertPipelineLabel',
              { defaultMessage: 'Delete custom pipeline' }
            )}
          </EuiButtonEmpty>
        ) : (
          <EuiButtonEmpty
            data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-ingestPipelines-copyAndCustomize`}
            disabled={isGated}
            isLoading={createStatus === Status.LOADING}
            iconType={isGated ? 'lock' : undefined}
            onClick={() => createCustomPipeline({ indexName })}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.index.pipelines.ingestFlyout.copyButtonLabel',
              { defaultMessage: 'Copy and customize' }
            )}
          </EuiButtonEmpty>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
};
