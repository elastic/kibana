/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiForm, EuiFormRow, EuiIcon, EuiText, EuiToolTip, withEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  BooleanRelation,
  FILTERS,
  type Filter,
  buildCombinedFilter,
  buildCustomFilter,
  buildEmptyFilter,
  filterToQueryDsl,
  getFilterParams,
  isCombinedFilter,
} from '@kbn/es-query';
import { merge } from 'lodash';
import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { DataView } from '@kbn/data-views-plugin/common';
import { getIndexPatternFromFilter } from '@kbn/data-plugin/public';
import { cx } from '@emotion/css';
import { WithEuiThemeProps } from '@elastic/eui/src/services/theme';

import { FiltersBuilder } from '../../filters_builder';
import { FilterBadgeGroup } from '../../filter_badge/filter_badge_group';

import {
  getFieldFromFilter,
  getOperatorFromFilter,
  isFilterValid,
} from './lib/filter_editor_utils';
import { flattenFilters } from './lib/helpers';
import {
  filterBadgeStyle,
  filterPreviewLabelStyle,
  filtersBuilderMaxHeightCss,
} from './filter_editor.styles';
import { Operator } from './lib';

export const strings = {
  getPanelTitleAdd: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.addFilterPopupTitle', {
      defaultMessage: 'Add filter',
    }),
  getPanelTitleEdit: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.editFilterPopupTitle', {
      defaultMessage: 'Edit filter',
    }),

  getAddButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.addButtonLabel', {
      defaultMessage: 'Add filter',
    }),
  getUpdateButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.updateButtonLabel', {
      defaultMessage: 'Update filter',
    }),
  getSelectDataViewToolTip: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.chooseDataViewFirstToolTip', {
      defaultMessage: 'You need to select a data view first',
    }),
  getCustomLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.createCustomLabelInputLabel', {
      defaultMessage: 'Custom label (optional)',
    }),
  getAddCustomLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.customLabelPlaceholder', {
      defaultMessage: 'Add a custom label here',
    }),
  getSelectDataView: () =>
    i18n.translate('unifiedSearch.filter.filterBar.indexPatternSelectPlaceholder', {
      defaultMessage: 'Select a data view',
    }),
  getDataView: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.dateViewSelectLabel', {
      defaultMessage: 'Data view',
    }),
  getQueryDslLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.queryDslLabel', {
      defaultMessage: 'Elasticsearch Query DSL',
    }),
  getQueryDslAriaLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.queryDslAriaLabel', {
      defaultMessage: 'Elasticsearch Query DSL editor',
    }),
  getSpatialFilterQueryDslHelpText: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.spatialFilterQueryDslHelpText', {
      defaultMessage:
        'Editing Elasticsearch Query DSL prevents filter geometry from displaying in map.',
    }),
};

interface QueryDslFilter {
  queryDsl: string;
  customLabel: string | null;
}

export interface FilterEditorComponentProps {
  filter: Filter;
  indexPatterns: DataView[];
  operators: Operator[];
  onLocalFilterCreate?: (initialState: { filter: Filter; queryDslFilter: QueryDslFilter }) => void;
  onLocalFilterUpdate?: (filter: Filter | QueryDslFilter) => void;
  timeRangeForSuggestionsOverride?: boolean;
  filtersForSuggestions?: Filter[];
  mode?: 'edit' | 'add';
}

export type FilterEditorProps = WithEuiThemeProps & FilterEditorComponentProps;

interface State {
  operators: Operator[];
  selectedDataView?: DataView;
  customLabel: string | null;
  queryDsl: string;
  isCustomEditorOpen: boolean;
  localFilter: Filter;
}

class FilterEditorComponent extends Component<FilterEditorProps, State> {
  constructor(props: FilterEditorProps) {
    super(props);
    const dataView = this.getIndexPatternFromFilter();
    this.state = {
      operators: props.operators,
      selectedDataView: dataView,
      customLabel: props.filter.meta.alias || '',
      queryDsl: this.parseFilterToQueryDsl(props.filter),
      isCustomEditorOpen: this.isUnknownFilterType() || !!this.props.filter?.meta.isMultiIndex,
      localFilter: dataView ? merge({}, props.filter) : buildEmptyFilter(false),
    };
  }

  componentDidMount() {
    const { localFilter, queryDsl, customLabel } = this.state;
    this.props.onLocalFilterCreate?.({
      filter: localFilter,
      queryDslFilter: { queryDsl, customLabel },
    });
    this.props.onLocalFilterUpdate?.(localFilter);
  }

  private parseFilterToQueryDsl(filter: Filter) {
    const dsl = filterToQueryDsl(filter, this.props.indexPatterns);
    return JSON.stringify(dsl, null, 2);
  }

  public render() {
    return (
      <div>
        <EuiForm>
          <div className="globalFilterItem__editorForm">{this.renderFiltersBuilderEditor()}</div>
        </EuiForm>
      </div>
    );
  }

  private hasCombinedFilterCustomType(filters: Filter[]) {
    return filters.some((filter) => filter.meta.type === 'custom');
  }

  private renderFiltersBuilderEditor() {
    const { selectedDataView, localFilter, operators } = this.state;
    const flattenedFilters = flattenFilters([localFilter]);

    const shouldShowPreview =
      selectedDataView &&
      ((flattenedFilters.length > 1 && !this.hasCombinedFilterCustomType(flattenedFilters)) ||
        (flattenedFilters.length === 1 &&
          isFilterValid(
            selectedDataView,
            getFieldFromFilter(flattenedFilters[0], selectedDataView),
            getOperatorFromFilter(flattenedFilters[0], operators),
            getFilterParams(flattenedFilters[0])
          )));

    return (
      <>
        <div
          role="region"
          aria-label=""
          className={cx(filtersBuilderMaxHeightCss(this.props.theme.euiTheme), 'eui-yScroll')}
        >
          <EuiToolTip
            position="top"
            content={selectedDataView ? '' : strings.getSelectDataViewToolTip()}
            display="block"
          >
            <FiltersBuilder
              filters={[localFilter]}
              timeRangeForSuggestionsOverride={this.props.timeRangeForSuggestionsOverride}
              filtersForSuggestions={this.props.filtersForSuggestions}
              operators={operators}
              dataView={selectedDataView!}
              onChange={this.onLocalFilterChange}
              disabled={!selectedDataView}
            />
          </EuiToolTip>
        </div>

        {shouldShowPreview ? (
          <EuiFormRow
            fullWidth
            hasEmptyLabelSpace={true}
            className={cx(filterBadgeStyle, filterPreviewLabelStyle)}
            label={
              <strong>
                <FormattedMessage
                  id="unifiedSearch.filter.filterBar.preview"
                  defaultMessage="{icon} Preview"
                  values={{
                    icon: <EuiIcon type="inspect" size="s" />,
                  }}
                />
              </strong>
            }
          >
            <EuiText size="xs" data-test-subj="filter-preview">
              <FilterBadgeGroup
                filters={[localFilter]}
                dataViews={this.props.indexPatterns}
                booleanRelation={BooleanRelation.AND}
                shouldShowBrackets={false}
              />
            </EuiText>
          </EuiFormRow>
        ) : null}
      </>
    );
  }

  private isUnknownFilterType() {
    const { type } = this.props.filter.meta;
    if (isCombinedFilter(this.props.filter)) {
      const { params } = this.props.filter.meta;
      return params && this.hasCombinedFilterCustomType(params);
    }
    return !!type && !['phrase', 'phrases', 'range', 'exists', 'combined'].includes(type);
  }

  private getIndexPatternFromFilter() {
    console.log('getIndexPatternFromFilter', {
      ip: this.props.indexPatterns,
      filter: this.props.filter,
    });
    return getIndexPatternFromFilter(this.props.filter, this.props.indexPatterns);
  }

  private onLocalFilterChange = (updatedFilters: Filter[]) => {
    const { selectedDataView, customLabel } = this.state;
    const alias = customLabel || null;
    const {
      $state,
      meta: { disabled = false },
    } = this.props.filter;

    if (!$state || !$state.store || !selectedDataView) {
      return;
    }

    let newFilter: Filter;

    if (updatedFilters.length === 1) {
      const f = updatedFilters[0];
      newFilter = {
        ...f,
        $state: {
          store: $state.store,
        },
        meta: {
          ...f.meta,
          disabled,
          alias,
        },
      };
    } else {
      // for the combined filters created on the builder, negate should always be false,
      // the global negation changes only from the exclude/inclue results panel item
      newFilter = buildCombinedFilter(
        BooleanRelation.AND,
        updatedFilters,
        selectedDataView,
        disabled,
        false,
        alias,
        $state.store
      );
    }

    this.setState({ localFilter: newFilter });
    this.props.onLocalFilterUpdate?.(newFilter);
  };
}

export const FilterEditor = withEuiTheme(FilterEditorComponent);
