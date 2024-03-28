/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX } from '../../../../../common/constants';
import { stripSearchPrefix } from '../../../../../common/utils/strip_search_prefix';

import { docLinks } from '../../../shared/doc_links';

import { KibanaLogic } from '../../../shared/kibana';

import { mappingsWithPropsApiLogic } from '../../api/mappings/mappings_logic';

import {
  AccessControlIndexSelector,
  AccessControlSelectorOption,
} from './components/access_control_index_selector/access_control_index_selector';
import { IndexNameLogic } from './index_name_logic';
import { IndexViewLogic } from './index_view_logic';

import './index_mappings.scss';

export const SearchIndexIndexMappings: React.FC = () => {
  const { indexName } = useValues(IndexNameLogic);
  const { hasDocumentLevelSecurityFeature, isHiddenIndex } = useValues(IndexViewLogic);
  const { indexMappingComponent: IndexMappingComponent, productFeatures } = useValues(KibanaLogic);

  const [selectedIndexType, setSelectedIndexType] =
    useState<AccessControlSelectorOption['value']>('content-index');
  const indexToShow =
    selectedIndexType === 'content-index'
      ? indexName
      : stripSearchPrefix(indexName, CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX);
  const { makeRequest: makeMappingRequest } = useActions(mappingsWithPropsApiLogic(indexToShow));
  const { error } = useValues(mappingsWithPropsApiLogic(indexToShow));
  const shouldShowAccessControlSwitch =
    hasDocumentLevelSecurityFeature && productFeatures.hasDocumentLevelSecurityEnabled;
  const isAccessControlIndexNotFound =
    shouldShowAccessControlSwitch && error?.body?.statusCode === 404;

  useEffect(() => {
    makeMappingRequest({ indexName: indexToShow });
  }, [indexToShow, indexName]);

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>
          <EuiFlexGroup direction="column" gutterSize="s">
            {shouldShowAccessControlSwitch && (
              <EuiFlexItem grow={false} className="enterpriseSearchMappingsSelector">
                <AccessControlIndexSelector
                  onChange={setSelectedIndexType}
                  valueOfSelected={selectedIndexType}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow>
              {isAccessControlIndexNotFound ? (
                <EuiCallOut
                  size="m"
                  title={i18n.translate(
                    'xpack.enterpriseSearch.content.searchIndex.mappings.noIndex.title',
                    { defaultMessage: 'Access Control Index not found' }
                  )}
                  iconType="iInCircle"
                >
                  <p>
                    {i18n.translate('xpack.enterpriseSearch.content.searchIndex.mappings.noIndex', {
                      defaultMessage:
                        "An Access Control Index won't be created until you enable document-level security and run your first access control sync.",
                    })}
                  </p>
                </EuiCallOut>
              ) : (
                <>
                  {IndexMappingComponent ? (
                    <IndexMappingComponent
                      index={{
                        aliases: [],
                        hidden: isHiddenIndex,
                        isFrozen: false,
                        name: indexToShow,
                      }}
                      showAboutMappings={false}
                    />
                  ) : (
                    <EuiCallOut
                      color="danger"
                      iconType="warn"
                      title={i18n.translate(
                        'xpack.enterpriseSearch.content.searchIndex.mappings.noMappingsComponent',
                        { defaultMessage: 'Mappings component not found' }
                      )}
                    />
                  )}
                </>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiPanel grow={false} hasShadow={false} hasBorder>
            <EuiFlexGroup justifyContent="center" gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="iInCircle" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('xpack.enterpriseSearch.content.searchIndex.mappings.title', {
                      defaultMessage: 'About index mappings',
                    })}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.searchIndex.mappings.description"
                  defaultMessage="Your documents are made up of a set of fields. Index mappings give each field a type (such as {keyword}, {number}, or {date}) and additional subfields. These index mappings determine the functions available in your relevance tuning and search experience."
                  values={{
                    keyword: <EuiCode>keyword</EuiCode>,
                    number: <EuiCode>number</EuiCode>,
                    date: <EuiCode>date</EuiCode>,
                  }}
                />
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiLink href={docLinks.elasticsearchMapping} target="_blank" external>
              {i18n.translate('xpack.enterpriseSearch.content.searchIndex.mappings.docLink', {
                defaultMessage: 'Learn more',
              })}
            </EuiLink>
          </EuiPanel>
          <EuiSpacer />
          <EuiPanel grow={false} hasShadow={false} hasBorder>
            <EuiFlexGroup justifyContent="center" gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="iInCircle" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('xpack.enterpriseSearch.content.searchIndex.transform.title', {
                      defaultMessage: 'Transform your searchable content',
                    })}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.searchIndex.transform.description"
                  defaultMessage="Want to add custom fields, or use trained ML models to analyze and enrich your indexed documents? Use index-specific ingest pipelines to customize documents to your needs."
                />
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiLink href={docLinks.ingestPipelines} target="_blank" external>
              {i18n.translate('xpack.enterpriseSearch.content.searchIndex.transform.docLink', {
                defaultMessage: 'Learn more',
              })}
            </EuiLink>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
