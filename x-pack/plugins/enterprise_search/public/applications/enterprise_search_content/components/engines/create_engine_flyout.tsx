/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
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
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { Status } from '../../../../../common/types/api';
import { ElasticsearchIndexWithIngestion } from '../../../../../common/types/indices';
import { isNotNullish } from '../../../../../common/utils/is_not_nullish';

import { CANCEL_BUTTON_LABEL } from '../../../shared/constants';

import { getErrorsFromHttpResponse } from '../../../shared/flash_messages/handle_api_errors';

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

  const onIndicesChange = (
    selectedOptions: Array<EuiComboBoxOptionOption<ElasticsearchIndexWithIngestion>>
  ) => {
    setSelectedIndices(selectedOptions.map((option) => option.value).filter(isNotNullish));
  };

  return (
    <EuiFlyout onClose={onClose} size="m">
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h3>
            {i18n.translate('xpack.enterpriseSearch.content.engines.createEngine.headerTitle', {
              defaultMessage: 'Create an engine',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.content.engines.createEngine.headerSubTitle"
              defaultMessage="An engine allows your users to query data in your indices. Explore our {enginesDocsLink} to learn more!"
              values={{
                enginesDocsLink: (
                  <EuiLink
                    href="#" // TODO: replace with docs link
                    target="_blank"
                    data-telemetry-id="entSearchContent-engines-createEngine-docsLink"
                    external
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.engines.createEngine.header.docsLink',
                      { defaultMessage: 'Engines documentation' }
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
                { defaultMessage: 'Error creating engine' }
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
        <EuiSteps
          steps={[
            {
              children: (
                <IndicesSelectComboBox
                  fullWidth
                  isDisabled={formDisabled}
                  onChange={onIndicesChange}
                  selectedOptions={selectedIndices.map(indexToOption)}
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
                    { defaultMessage: 'Engine name' }
                  )}
                  value={engineName}
                  onChange={(e) => setEngineName(e.target.value)}
                />
              ),
              status: engineNameStatus,
              title: i18n.translate(
                'xpack.enterpriseSearch.content.engines.createEngine.nameEngine.title',
                { defaultMessage: 'Name your engine' }
              ),
            },
          ]}
        />
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
              disabled={createDisabled || formDisabled}
              data-telemetry-id="entSearchContent-engines-createEngine-submit"
              fill
              iconType="plusInCircle"
              onClick={() => {
                createEngine();
              }}
            >
              {i18n.translate('xpack.enterpriseSearch.content.engines.createEngine.submit', {
                defaultMessage: 'Create this engine',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
