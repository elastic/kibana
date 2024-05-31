/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { documentationService } from '../../../../services/documentation';
import { DocumentFieldsSearch } from './document_fields_search';

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
                <EuiLink href={documentationService.getMappingTypesLink()} target="_blank" external>
                  {i18n.translate('xpack.idxMgmt.mappingsEditor.documentFieldsDocumentationLink', {
                    defaultMessage: 'Learn more.',
                  })}
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      </EuiFlexItem>
      <DocumentFieldsSearch searchValue={searchValue} onSearchChange={onSearchChange} />
    </EuiFlexGroup>
  );
});
