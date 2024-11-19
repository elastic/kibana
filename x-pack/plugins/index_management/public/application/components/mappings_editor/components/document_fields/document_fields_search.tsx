/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFieldSearch, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  searchValue: string;
  onSearchChange(value: string): void;
  disabled?: boolean;
}

export const DocumentFieldsSearch = React.memo(
  ({ searchValue, onSearchChange, disabled = false }: Props) => {
    return (
      <EuiFlexItem grow={false}>
        <EuiFieldSearch
          disabled={disabled}
          fullWidth
          placeholder={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.documentFields.searchFieldsPlaceholder',
            {
              defaultMessage: 'Search fields',
            }
          )}
          value={searchValue}
          onChange={(e) => {
            // Temporary fix until EUI fixes the contract
            // See my comment https://github.com/elastic/eui/pull/2723/files#r366725059
            if (typeof e === 'string') {
              onSearchChange(e);
            } else {
              onSearchChange(e.target.value);
            }
          }}
          aria-label={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.documentFields.searchFieldsAriaLabel',
            {
              defaultMessage: 'Search mapped fields',
            }
          )}
          data-test-subj="indexDetailsMappingsFieldSearch"
        />
      </EuiFlexItem>
    );
  }
);
