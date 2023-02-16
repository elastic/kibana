/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import type {
  InputViewProps,
  ResultViewProps,
  ResultsViewProps,
} from '@elastic/react-search-ui-views';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useSelectedDocument } from './document_context';

export const ResultsView: React.FC<ResultsViewProps> = ({ children }) => {
  return <EuiFlexGroup direction="column">{children}</EuiFlexGroup>;
};

export const ResultView: React.FC<ResultViewProps> = ({ result }) => {
  const { setSelectedDocument } = useSelectedDocument();

  const fields = Object.entries(result)
    .filter(([key]) => !key.startsWith('_') && key !== 'id')
    .map(([key, value]) => {
      return {
        name: key,
        value: value.raw,
      };
    });

  const {
    _meta: {
      id: encodedId,
      rawHit: { _index: index },
    },
  } = result;

  const [, id] = JSON.parse(atob(encodedId));

  const columns: Array<EuiBasicTableColumn<{ name: string; value: string }>> = [
    {
      field: 'name',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.engine.searchPreview.result.nameColumn',
        { defaultMessage: 'Field' }
      ),
      render: (name: string) => {
        return (
          <EuiText>
            <EuiTextColor color="subdued">
              <code>&quot;{name}&quot;</code>
            </EuiTextColor>
          </EuiText>
        );
      },
      truncateText: true,
      width: '20%',
    },
    {
      field: 'value',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.engine.searchPreview.result.valueColumn',
        { defaultMessage: 'Value' }
      ),
      render: (value: string) => (
        <EuiText>
          <code>{value}</code>
        </EuiText>
      ),
    },
  ];

  return (
    <button type="button" onClick={() => setSelectedDocument(result)}>
      <EuiPanel paddingSize="m">
        <EuiFlexGroup direction="column">
          <EuiFlexGroup justifyContent="spaceBetween">
            <code>
              <FormattedMessage
                id="xpack.enterpriseSearch.content.engine.searchPreview.result.id"
                defaultMessage="ID: {id}"
                values={{ id }}
              />
            </code>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" alignItems="center">
                <code>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.content.engine.searchPreview.result.fromIndex"
                    defaultMessage="from"
                  />
                </code>
                <EuiBadge color="hollow">{index}</EuiBadge>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiBasicTable items={fields} columns={columns} />
        </EuiFlexGroup>
      </EuiPanel>
    </button>
  );
};

export const InputView: React.FC<InputViewProps> = ({ getInputProps }) => {
  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFieldSearch
        fullWidth
        placeholder={i18n.translate(
          'xpack.enterpriseSearch.content.engine.searchPreview.inputView.placeholder',
          { defaultMessage: 'Search' }
        )}
        {...getInputProps({})}
        isClearable
        aria-label={i18n.translate(
          'xpack.enterpriseSearch.content.engine.searchPreview.inputView.label',
          { defaultMessage: 'Search Input' }
        )}
      />
      <EuiButton type="submit" color="primary" fill>
        Search
      </EuiButton>
    </EuiFlexGroup>
  );
};
