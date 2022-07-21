/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { DocumentsLogic } from './documents_logic';
import { IndexNameLogic } from './index_name_logic';

export const SearchIndexIndexMappings: React.FC = () => {
  const { indexName } = useValues(IndexNameLogic);
  const { makeMappingRequest } = useActions(DocumentsLogic);
  const { mappingData } = useValues(DocumentsLogic);

  useEffect(() => {
    makeMappingRequest({ indexName });
  }, [indexName]);

  return (
    <EuiPanel>
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>
          <EuiCodeBlock language="json">{JSON.stringify(mappingData, null, 2)}</EuiCodeBlock>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiPanel grow={false} hasShadow={false} hasBorder>
            <EuiTitle>
              <h3>About index mappings</h3>
            </EuiTitle>
            <EuiText>
              <p>
                Index mappings tell all the bits of bacon where arrange themselves in the omlet.
                Perfect bacon arrangement leads to the perfect omlet.
              </p>
            </EuiText>
            <EuiLink>Learn more</EuiLink>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
