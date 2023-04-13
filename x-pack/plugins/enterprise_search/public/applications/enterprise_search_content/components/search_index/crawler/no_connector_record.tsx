/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiPageTemplate } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../common/types/api';

import { RecreateCrawlerConnectorApiLogic } from '../../../api/crawler/recreate_crawler_connector_api_logic';
import { DeleteIndexModal } from '../../search_indices/delete_index_modal';
import { IndicesLogic } from '../../search_indices/indices_logic';
import { IndexViewLogic } from '../index_view_logic';

import { NoConnectorRecordLogic } from './no_connector_record_logic';

export const NoConnectorRecord: React.FC = () => {
  const { indexName } = useValues(IndexViewLogic);
  const { isDeleteLoading } = useValues(IndicesLogic);
  const { openDeleteModal } = useActions(IndicesLogic);
  const { makeRequest } = useActions(RecreateCrawlerConnectorApiLogic);
  const { status } = useValues(RecreateCrawlerConnectorApiLogic);
  NoConnectorRecordLogic.mount();
  const buttonsDisabled = status === Status.LOADING || isDeleteLoading;

  return (
    <>
      <DeleteIndexModal />

      <EuiPageTemplate.EmptyPrompt
        iconType="warning"
        color="danger"
        title={
          <h2>
            {i18n.translate(
              'xpack.enterpriseSearch.content.searchIndex.noCrawlerConnectorFound.title',
              {
                defaultMessage: "This index's connector configuration has been removed",
              }
            )}
          </h2>
        }
        body={
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.content.searchIndex.noCrawlerConnectorFound.description',
              {
                defaultMessage:
                  'We could not find a connector configuration for this crawler index. The record should be recreated, or the index should be deleted.',
              }
            )}
          </p>
        }
        actions={[
          <EuiButton
            color="danger"
            disabled={buttonsDisabled}
            isLoading={status === Status.LOADING}
            onClick={() => makeRequest({ indexName })}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.searchIndex.noCrawlerConnectorFound.recreateConnectorRecord',
              {
                defaultMessage: 'Recreate connector record',
              }
            )}
          </EuiButton>,
          <EuiButton
            color="danger"
            disabled={buttonsDisabled}
            isLoading={isDeleteLoading}
            fill
            onClick={() => openDeleteModal(indexName)}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.searchIndex.noCrawlerConnectorFound.deleteIndex',
              {
                defaultMessage: 'Delete index',
              }
            )}
          </EuiButton>,
        ]}
      />
    </>
  );
};
