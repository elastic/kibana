/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, Component } from 'react';
import {
  EuiFormRow,
  EuiSelect,
  EuiTitle,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { SingleFieldSelect } from '../../../../components/single_field_select';
import { TooltipSelector } from '../../../../components/tooltip_selector';

import { getIndexPatternService } from '../../../../kibana_services';
import {
  getGeoTileAggNotSupportedReason,
  getTermsFields,
  getSourceFields,
  supportsGeoTileAgg,
} from '../../../../index_pattern_util';
import {
  SortDirection,
  indexPatterns,
  IFieldType,
} from '../../../../../../../../src/plugins/data/public';
import { ESDocField } from '../../../fields/es_doc_field';
import { OnSourceChangeArgs } from '../../../../connected_components/layer_panel/view';
import { TopHitsForm } from './top_hits_form';

interface Props {
  filterByMapBounds: boolean;
  indexPatternId: string;
  onChange: (args: OnSourceChangeArgs) => void;
  tooltipFields: string[];
  sortField: string;
  sortOrder: SortDirection;
  source: ESSearchSource;
}

interface State {
  sourceFields: IFieldType[];
  termFields: IFieldType[];
  sortFields: IFieldType[];
}

export class TopHitsUpdateSourceEditor extends Component<Props, State> {
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
      });
    });

    this.setState({
      sourceFields,
      termFields: getTermsFields(indexPattern.fields),
      sortFields: indexPattern.fields.filter(
        (field) => field.sortable && !indexPatterns.isNestedField(field)
      ),
    });
  }
  _onTooltipPropertiesChange = (propertyNames) => {
    this.props.onChange({ propName: 'tooltipProperties', value: propertyNames });
  };

  _onSortFieldChange = (sortField) => {
    this.props.onChange({ propName: 'sortField', value: sortField });
  };

  _onSortOrderChange = (e) => {
    this.props.onChange({ propName: 'sortOrder', value: e.target.value });
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
            termFields={this.state.termFields}
            topHitsSplitField={this.props.topHitsSplitField}
            topHitsSize={this.props.topHitsSize}
          />

          <EuiFormRow
            label={i18n.translate('xpack.maps.source.esTopHitsSearch.sortFieldLabel', {
              defaultMessage: 'Sort field',
            })}
            display="columnCompressed"
          >
            <SingleFieldSelect
              placeholder={i18n.translate('xpack.maps.source.esSearch.sortFieldSelectPlaceholder', {
                defaultMessage: 'Select sort field',
              })}
              value={this.props.sortField}
              onChange={this._onSortFieldChange}
              fields={this.state.sortFields}
              compressed
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.maps.source.esTopHitsSearch.sortOrderLabel', {
              defaultMessage: 'Sort order',
            })}
            display="columnCompressed"
          >
            <EuiSelect
              disabled={!this.props.sortField}
              options={[
                {
                  text: i18n.translate('xpack.maps.source.esSearch.ascendingLabel', {
                    defaultMessage: 'ascending',
                  }),
                  value: SortDirection.asc,
                },
                {
                  text: i18n.translate('xpack.maps.source.esSearch.descendingLabel', {
                    defaultMessage: 'descending',
                  }),
                  value: SortDirection.desc,
                },
              ]}
              value={this.props.sortOrder}
              onChange={this._onSortOrderChange}
              compressed
            />
          </EuiFormRow>

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
