/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { EuiText, EuiLink, EuiFlexGroup, EuiFlexItem, EuiFieldSearch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { documentationService } from '../../../../services/documentation';

interface Props {
  searchValue: string;
  onSearchChange(value: string): void;
}

export const DocumentFieldsHeader = React.memo(({ searchValue, onSearchChange }: Props) => {
  return (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem>
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.idxMgmt.mappingsEditor.documentFieldsDescription"
            defaultMessage="Define the fields for your indexed documents. {docsLink}"
            values={{
              docsLink: (
                <EuiLink href={documentationService.getMappingTypesLink()} target="_blank">
                  {i18n.translate('xpack.idxMgmt.mappingsEditor.documentFieldsDocumentationLink', {
                    defaultMessage: 'Learn more.',
                  })}
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFieldSearch
          style={{ minWidth: '350px' }}
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
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
