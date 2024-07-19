/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiListGroup,
  EuiListGroupItem,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { GetIndicesIndexData } from '../../../common/types';

import { IndexListLabel } from './index_list_label';

export interface IndicesListProps {
  indices: GetIndicesIndexData[];
}
export const IndicesList = ({ indices }: IndicesListProps) => {
  const { euiTheme } = useEuiTheme();
  const onClickIndex = useCallback((index: GetIndicesIndexData) => () => {}, []);
  if (indices.length === 0) {
    // Handle empty filter result
    return (
      <>
        <EuiSpacer />
        <EuiFlexGroup
          alignItems="center"
          justifyContent="center"
          style={{ padding: euiTheme.size.m }}
        >
          <EuiText>
            <FormattedMessage
              id="xpack.searchHomepage.indicesCard.noSearchResults"
              defaultMessage="No indices found matching search query"
            />
          </EuiText>
        </EuiFlexGroup>
      </>
    );
  }
  return (
    <EuiListGroup flush style={{ minWidth: '100%' }}>
      {indices.map((index) => (
        <EuiListGroupItem
          id={`homepage-index-${index.name}`}
          key={`homepage-index-${index.name}`}
          onClick={onClickIndex(index)}
          size="xs"
          iconType="database"
          label={<IndexListLabel index={index} />}
          className="override"
          style={{
            border: `1px solid ${euiTheme.colors.lightShade}`,
            borderRadius: '.25rem',
          }}
        />
      ))}
    </EuiListGroup>
  );
};
