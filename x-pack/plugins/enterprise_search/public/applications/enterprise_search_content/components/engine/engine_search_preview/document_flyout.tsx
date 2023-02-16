/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

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

import { useSelectedDocument } from './document_context';

export const DocumentFlyout: React.FC = () => {
  const { selectedDocument, setSelectedDocument } = useSelectedDocument();

  if (selectedDocument === null) return null;

  const {
    _meta: { id: encodedId },
    id: _id,
    ...otherFields
  } = selectedDocument;
  const [, id] = JSON.parse(atob(encodedId));

  const fields = [
    { key: 'id', value: id },
    ...Object.entries(otherFields).map(([key, { raw: value }]) => ({ key, value })),
  ];

  const columns: Array<EuiBasicTableColumn<{ key: string; value: string }>> = [
    {
      field: 'key',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.engine.searchPreview.documentFlyout.fieldLabel',
        { defaultMessage: 'Field' }
      ),
      render: (key: string) => (
        <EuiText>
          <EuiTextColor color="subdued">
            <code>{key}</code>
          </EuiTextColor>
        </EuiText>
      ),
      truncateText: true,
    },
    {
      field: 'value',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.engine.searchPreview.documentFlyout.valueLabel',
        { defaultMessage: 'Value' }
      ),
      render: (key: string) => (
        <EuiText>
          <code>{key}</code>
        </EuiText>
      ),
      truncateText: true,
    },
  ];

  return (
    <EuiFlyout onClose={() => setSelectedDocument(null)}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.enterpriseSearch.content.engine.searchPreview.documentFlyout.title"
                defaultMessage="Document: {id}"
                values={{ id }}
              />
            </h2>
          </EuiTitle>
          <EuiTextColor color="subdued">
            <FormattedMessage
              id="xpack.enterpriseSearch.content.engine.searchPreivew.documentFlyout.fieldCount"
              defaultMessage="{fieldCount} {fieldCount, plural, one {Field} other {Fields}}"
              values={{ fieldCount: fields.length }}
            />
          </EuiTextColor>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiInMemoryTable columns={columns} items={fields} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
