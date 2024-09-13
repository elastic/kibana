/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { GenerateApiKeyModal } from './components/generate_api_key_modal/modal';

import { APIGettingStarted } from './components/getting_started/getting_started';
import { IndexViewLogic } from './index_view_logic';
import { OverviewLogic } from './overview.logic';

export const GenerateApiKeyPanel: React.FC = () => {
  const { isGenerateModalOpen } = useValues(OverviewLogic);
  const { indexName, isHiddenIndex } = useValues(IndexViewLogic);
  const { closeGenerateModal } = useActions(OverviewLogic);
  return (
    <>
      {isGenerateModalOpen && (
        <GenerateApiKeyModal indexName={indexName} onClose={closeGenerateModal} />
      )}
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="xl">
            {isHiddenIndex ? (
              <EuiEmptyPrompt
                body={
                  <p>
                    {i18n.translate('xpack.enterpriseSearch.content.overview.emptyPrompt.body', {
                      defaultMessage:
                        'We do not recommend adding documents to an externally managed index.',
                    })}
                  </p>
                }
                title={
                  <h2>
                    {i18n.translate('xpack.enterpriseSearch.content.overview.emptyPrompt.title', {
                      defaultMessage: 'Index managed externally',
                    })}
                  </h2>
                }
              />
            ) : (
              <APIGettingStarted />
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
