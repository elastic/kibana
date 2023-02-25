/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSelect,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import type {
  InputViewProps,
  PagingInfoViewProps,
  ResultViewProps,
  ResultsPerPageViewProps,
  ResultsViewProps,
} from '@elastic/react-search-ui-views';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedHTMLMessage } from '@kbn/i18n-react';

import { indexHealthToHealthColor } from '../../../../shared/constants/health_colors';

import { EngineViewLogic } from '../engine_view_logic';

import { useSelectedDocument } from './document_context';

export const ResultsView: React.FC<ResultsViewProps> = ({ children }) => {
  return <EuiFlexGroup direction="column">{children}</EuiFlexGroup>;
};

const RESULT_FIELDS_TRUNCATE_AT = 4;

export const ResultView: React.FC<ResultViewProps> = ({ result }) => {
  const { engineData } = useValues(EngineViewLogic);
  const { setSelectedDocument } = useSelectedDocument();

  const fields = Object.entries(result)
    .filter(([key]) => !key.startsWith('_') && key !== 'id')
    .map(([key, value]) => {
      return {
        name: key,
        value: value.raw,
      };
    });

  const truncatedFields = fields.slice(0, RESULT_FIELDS_TRUNCATE_AT);
  const hiddenFields = fields.length - truncatedFields.length;

  const {
    _meta: {
      id: encodedId,
      rawHit: { _index: index },
    },
  } = result;

  const [, id] = JSON.parse(atob(encodedId));

  const indexHealth = engineData?.indices.find((i) => i.name === index)?.health;
  const badgeColor =
    !indexHealth || indexHealth === 'unknown' ? 'hollow' : indexHealthToHealthColor(indexHealth);

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
        <EuiFlexGroup direction="column" gutterSize="m">
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
                <EuiBadge color={badgeColor}>{index}</EuiBadge>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiBasicTable items={truncatedFields} columns={columns} />
          {hiddenFields > 0 && (
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiIcon type="arrowRight" color="subdued" />
              <EuiTextColor color="subdued">
                <code>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.content.engine.searchPreview.result.moreFieldsButton"
                    defaultMessage="{count} {count, plural, one {More Field} other {More Fields}}"
                    values={{ count: hiddenFields }}
                  />
                </code>
              </EuiTextColor>
            </EuiFlexGroup>
          )}
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

export const PagingInfoView: React.FC<PagingInfoViewProps> = ({ start, end, totalResults }) => (
  <EuiText size="s">
    <FormattedHTMLMessage
      tagName="p"
      id="xpack.enterpriseSearch.content.engine.searchPreview.pagingInfo.text"
      defaultMessage="Showing <strong>{start}-{end}</strong> of {totalResults}"
      values={{ end, start, totalResults }}
    />
  </EuiText>
);

export const RESULTS_PER_PAGE_OPTIONS = [10, 20, 50];

export const ResultsPerPageView: React.FC<ResultsPerPageViewProps> = ({
  onChange,
  options,
  value,
}) => (
  <EuiFlexGroup direction="column" gutterSize="s">
    <EuiTitle size="xxxs">
      <label htmlFor="results-per-page">Show</label>
    </EuiTitle>
    <EuiSelect
      id="results-per-page"
      options={
        options?.map((option) => ({
          text: i18n.translate(
            'xpack.enterpriseSearch.content.engine.searchPreview.resultsPerPage.label',
            {
              defaultMessage: '{value} {value, plural, one {Result} other {Results}}',
              values: { value: option },
            }
          ),
          value: option,
        })) ?? []
      }
      value={value}
      onChange={(evt) => onChange(parseInt(evt.target.value, 10))}
    />
  </EuiFlexGroup>
);
