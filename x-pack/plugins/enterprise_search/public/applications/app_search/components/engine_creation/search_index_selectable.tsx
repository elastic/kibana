/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiSelectable, EuiPanel, EuiFormFieldset, EuiTitle } from '@elastic/eui';

export const SearchIndexSelectable: React.FC = () => {
  const options = [
    { label: 'enterprise-search-index0' },
    { label: 'enterprise-search-index1' },
    { label: 'enterprise-search-index2' },
    { label: 'enterprise-search-index3' },
    { label: 'enterprise-search-index4' },
    { label: 'enterprise-search-index5' },
  ];
  return (
    <EuiPanel color="subdued">
      <EuiFormFieldset
        legend={{
          children: (
            <EuiTitle size="xxs">
              <span>
                {i18n.translate('xpack.enterpriseSearch.elasticsearchIndexSelectionLabel', {defaultMessage: "Select an Elasticsearch index to use"})}
              </span>
            </EuiTitle>
          ),
        }}
      >
        <EuiSelectable
          aria-label="Select an Elasticsearch index"
          searchable
          options={options}
          singleSelection
        >
          {(list, search) => (
            <>
              {search}
              {list}
            </>
          )}
        </EuiSelectable>
      </EuiFormFieldset>
    </EuiPanel>
  );
};
