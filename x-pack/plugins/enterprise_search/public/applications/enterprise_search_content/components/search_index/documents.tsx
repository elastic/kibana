/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

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

import { Result } from '../../../shared/result/result';

import { DocumentsLogic } from './documents_logic';
import { IndexNameLogic } from './index_name_logic';

const onChange = () => {};

const iconMap: Record<string, string> = {
  boolean: 'tokenBoolen',
  date: 'tokenDate',
  date_range: 'tokenDate',
  double: 'tokenNumber',
  double_range: 'tokenDate',
  flattened: 'tokenObject',
  float: 'tokenNumber',
  float_range: 'tokenNumber',
  geo_point: 'tokenGeo',
  geo_shape: 'tokenGeo',
  half_float: 'tokenNumber',
  histogram: 'tokenHistogram',
  integer: 'tokenNumber',
  integer_range: 'tokenNumber',
  ip: 'tokenIp',
  ip_range: 'tokenIp',
  join: 'tokenJoin',
  keyword: 'tokenKeyword',
  long: 'tokenNumber',
  long_range: 'tokenNumber',
  nested: 'tokenObject',
  object: 'tokenObject',
  percolator: 'tokenPercolator',
  rank_feature: 'tokenRankFeature',
  rank_features: 'tokenRankFeatures',
  scaled_float: 'tokenNumber',
  search_as_you_type: 'tokenSearchType',
  shape: 'tokenShape',
  short: 'tokenNumber',
  text: 'tokenString',
  token_count: 'tokenTokenCount',
  unsigned_long: 'tokenNumber',
};
const defaultToken = 'questionInCircle';

export const SearchIndexDocuments: React.FC = () => {
  const { indexName } = useValues(IndexNameLogic);
  const { simplifiedMapping, results } = useValues(DocumentsLogic);
  const { makeRequest, makeMappingRequest } = useActions(DocumentsLogic);

  useEffect(() => {
    makeRequest({ indexName, query: '' });
    makeMappingRequest({ indexName });
  }, []);

  const resultToField = (result: SearchHit) => {
    if (result._source && !Array.isArray(result._source)) {
      if (typeof result._source === 'object') {
        return Object.entries(result._source).map(([key, value]) => {
          return {
            fieldName: key,
            fieldType: simplifiedMapping[key]?.type ?? 'object',
            fieldValue: JSON.stringify(value, null, 2),
            iconType: iconMap[simplifiedMapping[key]?.type ?? 'object'] || defaultToken,
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
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h2>Browse documents</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFieldSearch
                placeholder="Search documents in this index"
                isClearable
                onChange={onChange}
                fullWidth
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          {!simplifiedMapping && 'No mappings found for index'}
          {simplifiedMapping &&
            results.map((result) => {
              return (
                <>
                  <Result
                    actions={[
                      {
                        color: 'danger',
                        iconType: 'arrowDown',
                        label: 'action 1',
                        onClick: () => {},
                      },
                    ]}
                    fields={resultToField(result)}
                    metaData={{
                      clickCount: 0,
                      engineId: '123',
                      id: result._id,
                      lastUpdated: 'TODAY',
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
