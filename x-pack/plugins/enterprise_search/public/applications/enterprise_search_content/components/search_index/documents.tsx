/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, ChangeEvent } from 'react';

import { useActions, useValues } from 'kea';

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';

import {
  EuiFieldSearch,
  EuiTitle,
  EuiSpacer,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Result } from '../../../shared/result/result';

import { DocumentsLogic } from './documents_logic';
import { IndexNameLogic } from './index_name_logic';

import './documents.scss';

export const SearchIndexDocuments: React.FC = () => {
  const { indexName } = useValues(IndexNameLogic);
  const { simplifiedMapping, results } = useValues(DocumentsLogic);
  const { makeRequest, makeMappingRequest, setSearchQuery } = useActions(DocumentsLogic);

  useEffect(() => {
    makeRequest({ indexName, query: '' });
    makeMappingRequest({ indexName });
  }, [indexName]);

  const resultToField = (result: SearchHit) => {
    if (simplifiedMapping && result._source && !Array.isArray(result._source)) {
      if (typeof result._source === 'object') {
        return Object.entries(result._source).map(([key, value]) => {
          return {
            fieldName: key,
            fieldType: simplifiedMapping[key]?.type ?? 'object',
            fieldValue: JSON.stringify(value, null, 2),
          };
        });
      }
    }
    return [];
  };

  return (
    <EuiPanel hasBorder={false} hasShadow={false}>
      <EuiSpacer />
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" alignItems="center">
            <EuiFlexItem className="enterpriseSearchDocumentsHeader" grow={false}>
              <EuiTitle>
                <h2>
                  {i18n.translate('xpack.enterpriseSearch.content.searchIndex.documents.title', {
                    defaultMessage: 'Browse documents',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFieldSearch
                placeholder={i18n.translate(
                  'xpack.enterpriseSearch.content.searchIndex.documents.searchField.placeholder',
                  {
                    defaultMessage: 'Search documents in this index',
                  }
                )}
                isClearable
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(event.target.value)
                }
                fullWidth
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          {!simplifiedMapping &&
            i18n.translate('xpack.enterpriseSearch.content.searchIndex.documents.noMappings', {
              defaultMessage: 'No mappings found for index',
            })}

          {simplifiedMapping &&
            results.map((result) => {
              return (
                <>
                  <Result
                    fields={resultToField(result)}
                    metaData={{
                      id: result._id,
                    }}
                  />
                  <EuiSpacer size="s" />
                </>
              );
            })}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
