/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiHighlight,
  EuiIcon,
  EuiLink,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CANCEL_BUTTON_LABEL } from '../../../../shared/constants';

import { DocumentCreationLogic } from '../index';

import './elasticsearch_index.scss';

export const ElasticsearchIndex: React.FC = () => {
  const { loadElasticsearchIndices } = useActions(DocumentCreationLogic);
  useEffect(() => {
    loadElasticsearchIndices();
  }, []);
  return (
    <>
      <FlyoutHeader />
      <FlyoutBody />
      <FlyoutFooter />
    </>
  );
};

const renderIndexOption = (option, searchValue) => {
  return (
    <>
      <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
      <EuiSpacer size="xs" />
      <EuiTextColor color="subdued">
        <small>
          <span className="selectableSecondaryContentLabel">
            <EuiIcon type="dot" color={option.health === 'Healthy' ? 'success' : 'warning'} />{' '}
            &nbsp;{option.health}
          </span>
          <span className="selectableSecondaryContentLabel">
            <b>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.status',
                {
                  defaultMessage: 'Status:',
                }
              )}
            </b>
            &nbsp;{option.status}
          </span>
          <span className="selectableSecondaryContentLabel">
            <b>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.docCount',
                {
                  defaultMessage: 'Docs count:',
                }
              )}
            </b>
            &nbsp;{option.docsCount}
          </span>
          <span className="selectableSecondaryContentLabel">
            <b>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.storage',
                {
                  defaultMessage: 'Storage size:',
                }
              )}
            </b>
            &nbsp;{option.storage}
          </span>
        </small>
      </EuiTextColor>
    </>
  );
};

export const FlyoutHeader: React.FC = () => {
  return (
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="m">
        <h2>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.title',
            {
              defaultMessage: 'Connect an Elasticsearch index',
            }
          )}
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
  );
};

export const FlyoutBody: React.FC = () => {
  const { isUploading, isLoadingIndices, availableElasticsearchIndices } =
    useValues(DocumentCreationLogic);
  const { setAvailableElasticsearchIndices } = useActions(DocumentCreationLogic);
  return (
    <EuiFlyoutBody>
      <EuiText color="subdued">
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.description',
            {
              defaultMessage:
                'You can now connect directly to an existing Elasticsearch index to make its data searchable and tunable through Enterprise Search UIs.',
            }
          )}
          <EuiSpacer size="xs" />
          <EuiLink href="#todo" external>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.learnMoreLink',
              {
                defaultMessage: 'Learn more about using an Elasticsearch index',
              }
            )}
          </EuiLink>
        </p>
      </EuiText>
      <EuiSpacer />
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem>
          <EuiForm component="form">
            <EuiFormRow
              isDisabled={isUploading}
              fullWidth
              label={i18n.translate(
                'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.indexNameLabel',
                {
                  defaultMessage: 'Name your search index (optional)',
                }
              )}
              helpText={i18n.translate(
                'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.indexNameHelpText',
                {
                  defaultMessage:
                    'Provide a unique name for your index. This name will show when configuring search engines.',
                }
              )}
            >
              <EuiFieldText fullWidth />
            </EuiFormRow>

            <EuiFormRow
              isDisabled={isUploading}
              fullWidth
              label={i18n.translate(
                'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.indexSelectorLabel',
                {
                  defaultMessage: 'Select and existing Elasticsearch index',
                }
              )}
            >
              <EuiFlexItem>
                <EuiSelectable
                  aria-label={i18n.translate(
                    'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.indexSelectorAriaLabel',
                    {
                      defaultMessage: 'Select and existing Elasticsearch index',
                    }
                  )}
                  singleSelection="always"
                  searchable
                  isLoading={isLoadingIndices}
                  listProps={{ bordered: true, rowHeight: 56 }}
                  onChange={setAvailableElasticsearchIndices}
                  options={availableElasticsearchIndices}
                  loadingMessage={i18n.translate(
                    'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.selectable.loading',
                    {
                      defaultMessage: 'Loading Elasticsearch indices',
                    }
                  )}
                  emptyMessage={i18n.translate(
                    'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.selectable.empty',
                    { defaultMessage: 'No Elasticsearch indices available' }
                  )}
                  renderOption={renderIndexOption}
                >
                  {(list, search) => (
                    <>
                      {search}
                      {list}
                    </>
                  )}
                </EuiSelectable>
              </EuiFlexItem>
            </EuiFormRow>
          </EuiForm>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutBody>
  );
};

export const FlyoutFooter: React.FC = () => {
  const {
    isUploading,
    isLoadingIndices,
    availableElasticsearchIndices,
    isElasticsearchIndexSelected,
  } = useValues(DocumentCreationLogic);
  const { closeDocumentCreation, submitElasticsearchIndex } = useActions(DocumentCreationLogic);
  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={closeDocumentCreation}>{CANCEL_BUTTON_LABEL}</EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={submitElasticsearchIndex}
            isLoading={isUploading}
            isDisabled={
              isLoadingIndices ||
              availableElasticsearchIndices.length === 0 ||
              !isElasticsearchIndexSelected
            }
          >
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.connectButton',
              {
                defaultMessage: 'Connect to Index',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
