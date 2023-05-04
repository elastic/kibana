/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useLocation } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiLink,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
  EuiComboBoxOptionOption,
  EuiCallOut,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { Status } from '../../../../../common/types/api';
import { ElasticsearchIndexWithIngestion } from '../../../../../common/types/indices';

import { CANCEL_BUTTON_LABEL, ESINDEX_QUERY_PARAMETER } from '../../../shared/constants';
import { docLinks } from '../../../shared/doc_links';
import { getErrorsFromHttpResponse } from '../../../shared/flash_messages/handle_api_errors';

import { parseQueryParams } from '../../../shared/query_params';

import { indexToOption, IndicesSelectComboBox } from './components/indices_select_combobox';
import { CreateEngineLogic } from './create_engine_logic';

export interface CreateEngineFlyoutProps {
  onClose: () => void;
}

export const CreateEngineFlyout = ({ onClose }: CreateEngineFlyoutProps) => {
  const { createEngine, setEngineName, setSelectedIndices } = useActions(CreateEngineLogic);
  const {
    createDisabled,
    createEngineError,
    createEngineStatus,
    engineName,
    engineNameStatus,
    formDisabled,
    indicesStatus,
    selectedIndices,
  } = useValues(CreateEngineLogic);

  const { search } = useLocation() as unknown as Location;
  const { ...params } = parseQueryParams(search);
  const indexName = params[ESINDEX_QUERY_PARAMETER];

  const onIndicesChange = (
    selectedOptions: Array<EuiComboBoxOptionOption<ElasticsearchIndexWithIngestion>>
  ) => {
    setSelectedIndices(selectedOptions.map((option) => option.label));
  };
  useEffect(() => {
    if (indexName && typeof indexName === 'string') setSelectedIndices([indexName]);
  }, []);

  return (
    <EuiFlyout onClose={onClose} size="m">
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h3>
            {i18n.translate('xpack.enterpriseSearch.content.engines.createEngine.headerTitle', {
              defaultMessage: 'Create a Search Application',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.content.engines.createEngine.headerSubTitle"
              defaultMessage="Explore our {enginesDocsLink} to learn more!"
              values={{
                enginesDocsLink: (
                  <EuiLink
                    href={docLinks.enterpriseSearchEngines}
                    target="_blank"
                    data-telemetry-id="entSearchContent-engines-createEngine-docsLink"
                    external
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.engines.createEngine.header.docsLink',
                      { defaultMessage: 'Search Application documentation' }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
        {createEngineStatus === Status.ERROR && createEngineError && (
          <>
            <EuiSpacer />
            <EuiCallOut
              color="danger"
              title={i18n.translate(
                'xpack.enterpriseSearch.content.engines.createEngine.header.createError.title',
                { defaultMessage: 'Error creating search application' }
              )}
            >
              {getErrorsFromHttpResponse(createEngineError).map((errMessage, i) => (
                <p id={`createErrorMsg.${i}`}>{errMessage}</p>
              ))}
            </EuiCallOut>
          </>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow>
            <EuiCallOut title="Technical Preview feature" color="warning" iconType="beaker">
              <FormattedMessage
                id="xpack.enterpriseSearch.content.engines.createEngine.technicalPreviewCallOut.title"
                defaultMessage="This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will take a best effort approach to fix any issues, but features in technical preview are not subject to the support SLA of official GA features."
              />
            </EuiCallOut>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiSteps
              steps={[
                {
                  children: (
                    <IndicesSelectComboBox
                      fullWidth
                      isDisabled={formDisabled}
                      onChange={onIndicesChange}
                      selectedOptions={selectedIndices.map((index: string) => indexToOption(index))}
                    />
                  ),
                  status: indicesStatus,
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.engines.createEngine.selectIndices.title',
                    { defaultMessage: 'Select indices' }
                  ),
                },
                {
                  children: (
                    <EuiFieldText
                      fullWidth
                      disabled={formDisabled}
                      placeholder={i18n.translate(
                        'xpack.enterpriseSearch.content.engines.createEngine.nameEngine.placeholder',
                        { defaultMessage: 'Search application name' }
                      )}
                      value={engineName}
                      onChange={(e) => setEngineName(e.target.value)}
                    />
                  ),
                  status: engineNameStatus,
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.engines.createEngine.nameEngine.title',
                    { defaultMessage: 'Name your search application' }
                  ),
                },
              ]}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              disabled={formDisabled}
              data-telemetry-id="entSearchContent-engines-createEngine-cancel"
              onClick={onClose}
            >
              {CANCEL_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiButton
              isDisabled={createDisabled || formDisabled}
              data-telemetry-id="entSearchContent-engines-createEngine-submit"
              fill
              iconType="plusInCircle"
              onClick={() => {
                createEngine();
              }}
            >
              {i18n.translate('xpack.enterpriseSearch.content.engines.createEngine.submit', {
                defaultMessage: 'Create',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
