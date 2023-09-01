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
import { CreateSearchApplicationLogic } from './create_search_application_logic';

export interface CreateSearchApplicationFlyoutProps {
  onClose: () => void;
}

export const CreateSearchApplication = ({ onClose }: CreateSearchApplicationFlyoutProps) => {
  const { createSearchApplication, setName, setSelectedIndices } = useActions(
    CreateSearchApplicationLogic
  );
  const {
    createDisabled,
    createSearchApplicationError,
    createSearchApplicationStatus,
    searchApplicationName,
    searchApplicationNameStatus,
    formDisabled,
    indicesStatus,
    selectedIndices,
  } = useValues(CreateSearchApplicationLogic);

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
            {i18n.translate(
              'xpack.enterpriseSearch.searchApplications.createSearchApplication.headerTitle',
              {
                defaultMessage: 'Create a Search Application',
              }
            )}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.searchApplications.createSearchApplication.headerSubTitle"
              defaultMessage="Explore our {docsLink} to learn more!"
              values={{
                docsLink: (
                  <EuiLink
                    href={docLinks.searchApplications}
                    target="_blank"
                    data-telemetry-id="entSearchApplications-createSearchApplication-docsLink"
                    external
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.searchApplications.createSearchApplication.header.docsLink',
                      { defaultMessage: 'Search Applications documentation' }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
        {createSearchApplicationStatus === Status.ERROR && createSearchApplicationError && (
          <>
            <EuiSpacer />
            <EuiCallOut
              color="danger"
              title={i18n.translate(
                'xpack.enterpriseSearch.searchApplications.createSearchApplication.header.createError.title',
                { defaultMessage: 'Error creating search application' }
              )}
            >
              {getErrorsFromHttpResponse(createSearchApplicationError).map((errMessage, i) => (
                <p id={`createErrorMsg.${i}`}>{errMessage}</p>
              ))}
            </EuiCallOut>
          </>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow>
            <EuiCallOut
              title={i18n.translate(
                'xpack.enterpriseSearch.searchApplications.createSearchApplication.featureCallOut.title',
                { defaultMessage: 'Beta feature' }
              )}
              color="warning"
              iconType="beaker"
            >
              <FormattedMessage
                id="xpack.enterpriseSearch.searchApplications.createSearchApplication.featureCallOut.description"
                defaultMessage="This functionality is in beta and is subject to change. The design and code is less mature than official GA features and is being provided as-is with no warranties. Beta features are not subject to the support SLA of official GA features."
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
                    'xpack.enterpriseSearch.searchApplications.createSearchApplication.selectIndices.title',
                    { defaultMessage: 'Select indices' }
                  ),
                },
                {
                  children: (
                    <EuiFieldText
                      fullWidth
                      disabled={formDisabled}
                      placeholder={i18n.translate(
                        'xpack.enterpriseSearch.searchApplications.createSearchApplication.searchApplicationName.placeholder',
                        { defaultMessage: 'Search application name' }
                      )}
                      value={searchApplicationName}
                      onChange={(e) => setName(e.target.value)}
                    />
                  ),
                  status: searchApplicationNameStatus,
                  title: i18n.translate(
                    'xpack.enterpriseSearch.searchApplications.createSearchApplication.searchApplicationName.title',
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
              data-telemetry-id="entSearchApplications-createSearchApplication-cancel"
              onClick={onClose}
            >
              {CANCEL_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiButton
              isDisabled={createDisabled || formDisabled}
              data-telemetry-id="entSearchApplications-createSearchApplication-submit"
              fill
              iconType="plusInCircle"
              onClick={() => createSearchApplication()}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.searchApplications.createSearchApplication.submit',
                {
                  defaultMessage: 'Create',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
