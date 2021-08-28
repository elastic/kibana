/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiFormRow, EuiPanel, EuiSpacer, EuiSwitch, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';
import type { IFieldType } from '../../../../../../../../src/plugins/data/common/index_patterns/fields/types';
import { SortDirection } from '../../../../../../../../src/plugins/data/common/search/search_source/types';
import { FIELD_ORIGIN } from '../../../../../common/constants';
import { TooltipSelector } from '../../../../components/tooltip_selector/tooltip_selector';
import { getSortFields, getSourceFields, getTermsFields } from '../../../../index_pattern_util';
import { getIndexPatternService } from '../../../../kibana_services';
import { ESDocField } from '../../../fields/es_doc_field';
import type { IField } from '../../../fields/field';
import type { OnSourceChangeArgs } from '../../source';
import { ESSearchSource } from '../es_search_source';
import { TopHitsForm } from './top_hits_form';

interface Props {
  filterByMapBounds: boolean;
  indexPatternId: string;
  onChange: (args: OnSourceChangeArgs) => void;
  tooltipFields: IField[];
  topHitsSplitField: string;
  topHitsSize: number;
  sortField: string;
  sortOrder: SortDirection;
  source: ESSearchSource;
}

interface State {
  loadError?: string;
  sourceFields: IField[];
  termFields: IFieldType[];
  sortFields: IFieldType[];
}

export class TopHitsUpdateSourceEditor extends Component<Props, State> {
  private _isMounted = false;

  state: State = {
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
    let indexPattern;
    try {
      indexPattern = await getIndexPatternService().get(this.props.indexPatternId);
    } catch (err) {
      if (this._isMounted) {
        this.setState({
          loadError: i18n.translate('xpack.maps.source.esSearch.loadErrorMessage', {
            defaultMessage: `Unable to find Index pattern {id}`,
            values: {
              id: this.props.indexPatternId,
            },
          }),
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

          <TooltipSelector
            tooltipFields={this.props.tooltipFields}
            onChange={this._onTooltipPropertiesChange}
            fields={this.state.sourceFields}
          />
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

          <TopHitsForm
            indexPatternId={this.props.indexPatternId}
            isColumnCompressed={true}
            onChange={this.props.onChange}
            sortField={this.props.sortField}
            sortFields={this.state.sortFields}
            sortOrder={this.props.sortOrder}
            termFields={this.state.termFields}
            topHitsSplitField={this.props.topHitsSplitField}
            topHitsSize={this.props.topHitsSize}
          />

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
