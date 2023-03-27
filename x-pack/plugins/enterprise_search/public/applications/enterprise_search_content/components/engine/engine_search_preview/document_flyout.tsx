/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

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

import { ConvertedResult, convertResults } from './convert_results';
import { useSelectedDocument } from './document_context';

export const DocumentFlyout: React.FC = () => {
  const { selectedDocument, setSelectedDocument } = useSelectedDocument();

  const [id, items] = useMemo((): [string | null, ConvertedResult[]] => {
    if (!selectedDocument) return [null, []];
    const {
      _meta: { id: encodedId },
      id: _id,
      ...otherFields
    } = selectedDocument;
    const [, parsedId] = JSON.parse(atob(encodedId));
    const fields = {
      ...Object.fromEntries(
        Object.entries(otherFields).map(([key, { raw: value }]) => [key, value])
      ),
      id: parsedId,
    };
    return [parsedId, convertResults(fields)];
  }, [selectedDocument]);

  if (selectedDocument === null) return null;

  const columns: Array<EuiBasicTableColumn<ConvertedResult>> = [
    {
      field: 'field',
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
      truncateText: false,
    },
    {
      field: 'value',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.engine.searchPreview.documentFlyout.valueLabel',
        { defaultMessage: 'Value' }
      ),
      render: (value: string) => (
        <EuiText>
          <code>{value}</code>
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
