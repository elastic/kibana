/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiInMemoryTable,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { FieldIcon } from '../field_icon';

import {
  addTypeToResults,
  ConvertedResultWithType,
  convertResultToFieldsAndIndex,
  FieldValue,
} from './convert_results';
import { SearchApplicationDocsExplorerLogic } from './docs_explorer_logic';
import { useSelectedDocument } from './document_context';
import { FieldValueCell } from './field_value_cell';
import { SearchApplicationSearchPreviewLogic } from './search_preview_logic';

export const DocumentFlyout: React.FC = () => {
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/document_flyout.tsx
  const { fieldTypesByIndex } = useValues(SearchApplicationDocsExplorerLogic);
========
  const { fieldTypesByIndex } = useValues(SearchApplicationSearchPreviewLogic);
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/document_flyout.tsx
  const { selectedDocument, setSelectedDocument } = useSelectedDocument();

  if (!selectedDocument) return null;

  const id = selectedDocument._meta.rawHit.__id;

  const { fields, index } = convertResultToFieldsAndIndex(selectedDocument);
  const fieldTypes = fieldTypesByIndex[index];

  if (!fieldTypes) return null;

  const items = addTypeToResults(fields, fieldTypes);

  const columns: Array<EuiBasicTableColumn<ConvertedResultWithType>> = [
    {
      name: i18n.translate(
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/document_flyout.tsx
        'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.documentFlyout.fieldLabel',
========
        'xpack.enterpriseSearch.searchApplications.searchApplication.searchPreview.documentFlyout.fieldLabel',
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/document_flyout.tsx
        { defaultMessage: 'Field' }
      ),
      render: ({ field: key, type }: ConvertedResultWithType) => (
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <FieldIcon type={type} />
          <EuiText>
            <EuiTextColor color="subdued">
              <code>{key}</code>
            </EuiTextColor>
          </EuiText>
        </EuiFlexGroup>
      ),
      truncateText: false,
    },
    {
      field: 'value',
      name: i18n.translate(
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/document_flyout.tsx
        'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.documentFlyout.valueLabel',
========
        'xpack.enterpriseSearch.searchApplications.searchApplication.searchPreview.documentFlyout.valueLabel',
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/document_flyout.tsx
        { defaultMessage: 'Value' }
      ),
      render: (value: FieldValue) => (
        <EuiText>
          <code>
            <FieldValueCell value={value} />
          </code>
        </EuiText>
      ),
      truncateText: false,
    },
  ];

  return (
    <EuiFlyout onClose={() => setSelectedDocument(null)}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/document_flyout.tsx
                id="xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.documentFlyout.title"
========
                id="xpack.enterpriseSearch.searchApplications.searchApplication.searchPreview.documentFlyout.title"
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/document_flyout.tsx
                defaultMessage="Document: {id}"
                values={{ id }}
              />
            </h2>
          </EuiTitle>
          <EuiTextColor color="subdued">
            <FormattedMessage
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/document_flyout.tsx
              id="xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.documentFlyout.fieldCount"
========
              id="xpack.enterpriseSearch.searchApplications.searchApplication.searchPreview.documentFlyout.fieldCount"
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/document_flyout.tsx
              defaultMessage="{fieldCount} {fieldCount, plural, one {Field} other {Fields}}"
              values={{ fieldCount: items.length }}
            />
          </EuiTextColor>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiInMemoryTable columns={columns} items={items} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
