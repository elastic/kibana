/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import {
  EuiFormRow,
  EuiTitle,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { SortDirection } from '@kbn/data-plugin/public';
import { getDataViewNotFoundMessage } from '../../../../../common/i18n_getters';
import { FIELD_ORIGIN } from '../../../../../common/constants';
import { TooltipSelector } from '../../../../components/tooltip_selector';

import { getIndexPatternService } from '../../../../kibana_services';
import {
  getTermsFields,
  getIsTimeseries,
  getSortFields,
  getSourceFields,
} from '../../../../index_pattern_util';
import { ESDocField } from '../../../fields/es_doc_field';
import { OnSourceChangeArgs } from '../../source';
import { TopHitsForm } from './top_hits_form';
import { ESSearchSource } from '../es_search_source';
import { IField } from '../../../fields/field';

interface Props {
  filterByMapBounds: boolean;
  indexPatternId: string;
  onChange: (args: OnSourceChangeArgs) => void;
  tooltipFields: IField[];
  topHitsGroupByTimeseries: boolean;
  topHitsSplitField: string;
  topHitsSize: number;
  sortField: string;
  sortOrder: SortDirection;
  source: ESSearchSource;
}

interface State {
  isLoading: boolean;
  isTimeseries: boolean;
  loadError?: string;
  sourceFields: IField[];
  termFields: DataViewField[];
  sortFields: DataViewField[];
}

export class TopHitsUpdateSourceEditor extends Component<Props, State> {
  private _isMounted = false;

  state: State = {
    isLoading: false,
    isTimeseries: false,
    sourceFields: [],
    termFields: [],
    sortFields: [],
  };

  componentDidMount() {
    this._isMounted = true;
    this.loadFields();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async loadFields() {
    this.setState({ isLoading: true });

    let indexPattern;
    try {
      indexPattern = await getIndexPatternService().get(this.props.indexPatternId);
    } catch (err) {
      if (this._isMounted) {
        this.setState({
          isLoading: false,
          loadError: getDataViewNotFoundMessage(this.props.indexPatternId),
        });
      }
      return;
    }

    if (!this._isMounted) {
      return;
    }

    const rawTooltipFields = getSourceFields(indexPattern.fields);
    const sourceFields = rawTooltipFields.map((field) => {
      return new ESDocField({
        fieldName: field.name,
        source: this.props.source,
        origin: FIELD_ORIGIN.SOURCE,
      });
    });

    this.setState({
      isLoading: false,
      isTimeseries: getIsTimeseries(indexPattern),
      sourceFields,
      termFields: getTermsFields(indexPattern.fields),
      sortFields: getSortFields(indexPattern.fields),
    });
  }
  _onTooltipPropertiesChange = (propertyNames: string[]) => {
    this.props.onChange({ propName: 'tooltipProperties', value: propertyNames });
  };

  _onFilterByMapBoundsChange = (event: EuiSwitchEvent) => {
    this.props.onChange({ propName: 'filterByMapBounds', value: event.target.checked });
  };

  render() {
    return (
      <Fragment>
        <EuiPanel>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.maps.esSearch.tooltipsTitle"
                defaultMessage="Tooltip fields"
              />
            </h5>
          </EuiTitle>

          <EuiSpacer size="m" />

          <EuiSkeletonText lines={3} size="s" isLoading={this.state.isLoading}>
            <TooltipSelector
              tooltipFields={this.props.tooltipFields}
              onChange={this._onTooltipPropertiesChange}
              fields={this.state.sourceFields}
            />
          </EuiSkeletonText>
        </EuiPanel>
        <EuiSpacer size="s" />

        <EuiPanel>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.maps.source.topHitsPanelLabel"
                defaultMessage="Top hits"
              />
            </h5>
          </EuiTitle>

          <EuiSpacer size="m" />

          <EuiSkeletonText lines={3} size="s" isLoading={this.state.isLoading}>
            <TopHitsForm
              indexPatternId={this.props.indexPatternId}
              isColumnCompressed={true}
              isTimeseries={this.state.isTimeseries}
              onChange={this.props.onChange}
              sortField={this.props.sortField}
              sortFields={this.state.sortFields}
              sortOrder={this.props.sortOrder}
              termFields={this.state.termFields}
              topHitsGroupByTimeseries={this.props.topHitsGroupByTimeseries}
              topHitsSplitField={this.props.topHitsSplitField}
              topHitsSize={this.props.topHitsSize}
            />
          </EuiSkeletonText>

          <EuiFormRow>
            <EuiSwitch
              label={i18n.translate('xpack.maps.source.esSearch.extentFilterLabel', {
                defaultMessage: 'Dynamically filter for data in the visible map area',
              })}
              checked={this.props.filterByMapBounds}
              onChange={this._onFilterByMapBoundsChange}
              compressed
            />
          </EuiFormRow>
        </EuiPanel>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }
}
