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
  EuiComboBox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { withSearch } from '@elastic/react-search-ui';
import type {
  PagingInfoViewProps,
  ResultViewProps,
  ResultsPerPageViewProps,
  ResultsViewProps,
} from '@elastic/react-search-ui-views';
import type { SearchContextState } from '@elastic/search-ui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { indexHealthToHealthColor } from '../../../../shared/constants/health_colors';

import { SearchApplicationViewLogic } from '../search_application_view_logic';

import { convertResultToFieldsAndIndex, ConvertedResult, FieldValue } from './convert_results';
import { useSelectedDocument } from './document_context';
import { FieldValueCell } from './field_value_cell';

interface InputProps {
  additionalInputProps: JSX.Element;
}
export const ResultsView: React.FC<ResultsViewProps> = ({ children }) => {
  return <EuiFlexGroup direction="column">{children}</EuiFlexGroup>;
};

const RESULT_FIELDS_TRUNCATE_AT = 4;

export const ResultView: React.FC<ResultViewProps> = ({ result }) => {
  const { searchApplicationData } = useValues(SearchApplicationViewLogic);
  const { setSelectedDocument } = useSelectedDocument();

  const { fields, index } = convertResultToFieldsAndIndex(result);

  const id = result._meta.rawHit.__id;

  const truncatedFields = fields.slice(0, RESULT_FIELDS_TRUNCATE_AT);
  const hiddenFields = fields.length - truncatedFields.length;

  const indexHealth = searchApplicationData?.indices.find((i) => i.name === index)?.health;
  const badgeColor =
    !indexHealth || indexHealth === 'unknown' ? 'hollow' : indexHealthToHealthColor(indexHealth);

  const columns: Array<EuiBasicTableColumn<ConvertedResult>> = [
    {
      field: 'field',
      name: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.result.nameColumn',
        { defaultMessage: 'Field' }
      ),
      render: (field: string) => {
        return (
          <EuiText>
            <EuiTextColor color="subdued">
              <code>&quot;{field}&quot;</code>
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
        'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.result.valueColumn',
        { defaultMessage: 'Value' }
      ),
      render: (value: FieldValue) => (
        <EuiText>
          <code>
            <FieldValueCell value={value} />
          </code>
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
                id="xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.result.id"
                defaultMessage="ID: {id}"
                values={{ id }}
              />
            </code>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" alignItems="center">
                <code>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.result.fromIndex"
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
                    id="xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.result.moreFieldsButton"
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
export const SearchBar: React.FC<InputProps> = ({ additionalInputProps }) => (
  <EuiFlexGroup gutterSize="s">
    <EuiFieldSearch fullWidth {...additionalInputProps} />
    <EuiButton type="submit" color="primary" fill>
      {i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.inputView.searchLabel',
        {
          defaultMessage: 'Search',
        }
      )}
    </EuiButton>
  </EuiFlexGroup>
);
export const PagingInfoView: React.FC<PagingInfoViewProps> = ({ start, end, totalResults }) => (
  <EuiText size="s">
    <FormattedMessage
      tagName="p"
      id="xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.pagingInfo.text"
      defaultMessage="Showing <strong>{start}-{end}</strong> of {totalResults}"
      values={{
        end,
        start,
        totalResults,
        strong: (chunks) => `<strong>${chunks}</strong>`,
      }}
    />
  </EuiText>
);

export const RESULTS_PER_PAGE_OPTIONS = [10, 20, 50];

export const ResultsPerPageView: React.FC<ResultsPerPageViewProps> = ({
  onChange,
  options,
  value,
}) => (
  <EuiFlexItem grow={false}>
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiTitle size="xxxs">
        <label htmlFor="results-per-page">
          <FormattedMessage
            id="xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.resultsPerPage.label"
            defaultMessage="Show"
          />
        </label>
      </EuiTitle>
      <EuiSelect
        id="results-per-page"
        options={
          options?.map((option) => ({
            text: i18n.translate(
              'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.resultsPerPage.option.label',
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
  </EuiFlexItem>
);

export const Sorting = withSearch<
  { sortableFields: string[] },
  Pick<SearchContextState, 'setSort' | 'sortList'>
>(({ setSort, sortList }) => ({ setSort, sortList }))(({ sortableFields, sortList, setSort }) => {
  const [{ direction, field }] = !sortList?.length ? [{ direction: '', field: '' }] : sortList;
  const relevance = i18n.translate(
    'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.sortingView.relevanceLabel',
    { defaultMessage: 'Relevance' }
  );

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiTitle size="xxxs">
          <label htmlFor="sorting-field">
            <FormattedMessage
              id="xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.sortingView.fieldLabel"
              defaultMessage="Sort By"
            />
          </label>
        </EuiTitle>
        <EuiComboBox
          id="sorting-field"
          isClearable={false}
          singleSelection={{ asPlainText: true }}
          options={[
            { label: relevance, value: '' },
            ...sortableFields.map((f: string) => ({ label: f, value: f })),
          ]}
          selectedOptions={[{ label: !!field ? field : relevance, value: field }]}
          onChange={([{ value }]) =>
            setSort(value === '' ? [] : [{ direction: 'asc', field: value }], 'asc')
          }
        />
      </EuiFlexGroup>
      {field !== '' && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiTitle size="xxxs">
              <label htmlFor="sorting-direction">
                <FormattedMessage
                  id="xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.sortingView.directionLabel"
                  defaultMessage="Order By"
                />
              </label>
            </EuiTitle>
            <EuiSelect
              id="sorting-direction"
              onChange={(evt) => {
                switch (evt.target.value) {
                  case 'asc':
                    return setSort([{ direction: 'asc', field }], 'asc');
                  case 'desc':
                    return setSort([{ direction: 'desc', field }], 'desc');
                }
              }}
              value={direction}
              options={[
                {
                  text: i18n.translate(
                    'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.sortingView.ascLabel',
                    { defaultMessage: 'Ascending' }
                  ),
                  value: 'asc',
                },
                {
                  text: i18n.translate(
                    'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.sortingView.descLabel',
                    { defaultMessage: 'Descending' }
                  ),
                  value: 'desc',
                },
              ]}
            />
          </EuiFlexGroup>
        </>
      )}
    </EuiFlexItem>
  );
});
