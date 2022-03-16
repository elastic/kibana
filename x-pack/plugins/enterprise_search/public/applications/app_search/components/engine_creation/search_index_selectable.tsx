/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSelectable, EuiPanel, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

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
    <EuiPanel hasBorder>
      <EuiFormRow
        label={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engineCreation.searchIndexSelectable.label',
          { defaultMessage: 'Select an Elasticsearch index to use' }
        )}
        helpText={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engineCreation.searchIndexSelectable.helpText',
          { defaultMessage: "Only indices aliased with 'search-' can be selected" }
        )}
        fullWidth
      >
        <EuiSelectable
          aria-label="Select an Elasticsearch index"
          searchable
          options={options}
          listProps={{ bordered: true }}
          singleSelection
        >
          {(list, search) => (
            <>
              {search}
              {list}
            </>
          )}
        </EuiSelectable>
      </EuiFormRow>
    </EuiPanel>
  );
};
