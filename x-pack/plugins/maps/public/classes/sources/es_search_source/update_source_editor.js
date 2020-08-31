/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import { EuiFormRow, EuiSelect, EuiTitle, EuiPanel, EuiSpacer } from '@elastic/eui';
import { SingleFieldSelect } from '../../../components/single_field_select';
import { TooltipSelector } from '../../../components/tooltip_selector';

import { getIndexPatternService } from '../../../kibana_services';
import { i18n } from '@kbn/i18n';
import {
  getGeoTileAggNotSupportedReason,
  getTermsFields,
  getSourceFields,
  supportsGeoTileAgg,
} from '../../../index_pattern_util';
import { SORT_ORDER } from '../../../../common/constants';
import { ESDocField } from '../../fields/es_doc_field';
import { FormattedMessage } from '@kbn/i18n/react';
import { indexPatterns } from '../../../../../../../src/plugins/data/public';
import { ScalingForm } from './scaling_form';

export class UpdateSourceEditor extends Component {
  static propTypes = {
    indexPatternId: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    tooltipFields: PropTypes.arrayOf(PropTypes.object).isRequired,
    sortField: PropTypes.string,
    sortOrder: PropTypes.string.isRequired,
    scalingType: PropTypes.string.isRequired,
    topHitsSplitField: PropTypes.string,
    topHitsSize: PropTypes.number.isRequired,
    source: PropTypes.object,
  };

  state = {
    sourceFields: null,
    termFields: null,
    sortFields: null,
    supportsClustering: false,
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

    let geoField;
    try {
      geoField = await this.props.getGeoField();
    } catch (err) {
      if (this._isMounted) {
        this.setState({ loadError: err.message });
      }
      return;
    }

    if (!this._isMounted) {
      return;
    }

    //todo move this all to the source
    const rawTooltipFields = getSourceFields(indexPattern.fields);
    const sourceFields = rawTooltipFields.map((field) => {
      return new ESDocField({
        fieldName: field.name,
        source: this.props.source,
      });
    });

    this.setState({
      supportsClustering: supportsGeoTileAgg(geoField),
      clusteringDisabledReason: getGeoTileAggNotSupportedReason(geoField),
      sourceFields: sourceFields,
      termFields: getTermsFields(indexPattern.fields), //todo change term fields to use fields
      sortFields: indexPattern.fields.filter(
        (field) => field.sortable && !indexPatterns.isNestedField(field)
      ), //todo change sort fields to use fields
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

  _renderTooltipsPanel() {
    return (
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
    );
  }

  _renderSortPanel() {
    return (
      <EuiPanel>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage id="xpack.maps.esSearch.sortTitle" defaultMessage="Sorting" />
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esSearch.sortFieldLabel', {
            defaultMessage: 'Field',
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
          label={i18n.translate('xpack.maps.source.esSearch.sortOrderLabel', {
            defaultMessage: 'Order',
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
                value: SORT_ORDER.ASC,
              },
              {
                text: i18n.translate('xpack.maps.source.esSearch.descendingLabel', {
                  defaultMessage: 'descending',
                }),
                value: SORT_ORDER.DESC,
              },
            ]}
            value={this.props.sortOrder}
            onChange={this._onSortOrderChange}
            compressed
          />
        </EuiFormRow>
      </EuiPanel>
    );
  }

  _renderScalingPanel() {
    return (
      <EuiPanel>
        <ScalingForm
          filterByMapBounds={this.props.filterByMapBounds}
          indexPatternId={this.props.indexPatternId}
          onChange={this.props.onChange}
          scalingType={this.props.scalingType}
          supportsClustering={this.state.supportsClustering}
          clusteringDisabledReason={this.state.clusteringDisabledReason}
          termFields={this.state.termFields}
          topHitsSplitField={this.props.topHitsSplitField}
          topHitsSize={this.props.topHitsSize}
        />
      </EuiPanel>
    );
  }

  render() {
    return (
      <Fragment>
        {this._renderTooltipsPanel()}
        <EuiSpacer size="s" />

        {this._renderSortPanel()}
        <EuiSpacer size="s" />

        {this._renderScalingPanel()}
        <EuiSpacer size="s" />
      </Fragment>
    );
  }
}
