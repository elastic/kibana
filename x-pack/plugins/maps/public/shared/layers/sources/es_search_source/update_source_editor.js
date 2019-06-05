/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFormRow,
  EuiSwitch,
} from '@elastic/eui';
import { MultiFieldSelect } from '../../../components/multi_field_select';
import { SingleFieldSelect } from '../../../components/single_field_select';

import { indexPatternService } from '../../../../kibana_services';
import { i18n } from '@kbn/i18n';
import { getTermsFields } from '../../../utils/get_terms_fields';
import { ValidatedRange } from '../../../components/validated_range';

export class UpdateSourceEditor extends Component {

  static propTypes = {
    indexPatternId: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    filterByMapBounds: PropTypes.bool.isRequired,
    tooltipProperties: PropTypes.arrayOf(PropTypes.string).isRequired,
    useTopHits: PropTypes.bool.isRequired,
    topHitsSplitField: PropTypes.string,
    topHitsTimeField: PropTypes.string,
    topHitsSize: PropTypes.number.isRequired,
  }

  state = {
    tooltipFields: null,
    termFields: null,
    dateFields: null,
  }

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
      indexPattern = await indexPatternService.get(this.props.indexPatternId);
    } catch (err) {
      if (this._isMounted) {
        this.setState({
          loadError: i18n.translate('xpack.maps.source.esSearch.loadErrorMessage', {
            defaultMessage: `Unable to find Index pattern {id}`,
            values: {
              id: this.props.indexPatternId
            }
          })
        });
      }
      return;
    }

    if (!this._isMounted) {
      return;
    }

    const dateFields = indexPattern.fields.filter(field => {
      return field.type === 'date';
    });

    this.setState({
      dateFields,
      tooltipFields: indexPattern.fields.filter(field => {
        // Do not show multi fields as tooltip field options
        // since they do not have values in _source and exist for indexing only
        return field.subType !== 'multi';
      }),
      termFields: getTermsFields(indexPattern.fields),
    });

    if (!this.props.topHitsTimeField) {
      // prefer default time field
      if (indexPattern.timeFieldName) {
        this.onTopHitsTimeFieldChange(indexPattern.timeFieldName);
      } else {
        // fall back to first date field in index
        if (dateFields.length > 0) {
          this.onTopHitsTimeFieldChange(dateFields[0].name);
        }
      }
    }
  }

  onTooltipPropertiesSelect = (propertyNames) => {
    this.props.onChange({ propName: 'tooltipProperties', value: propertyNames });
  };

  onFilterByMapBoundsChange = event => {
    this.props.onChange({ propName: 'filterByMapBounds', value: event.target.checked });
  };

  onUseTopHitsChange = event => {
    this.props.onChange({ propName: 'useTopHits', value: event.target.checked });
  };

  onTopHitsSplitFieldChange = topHitsSplitField => {
    this.props.onChange({ propName: 'topHitsSplitField', value: topHitsSplitField });
  };

  onTopHitsTimeFieldChange = topHitsTimeField => {
    this.props.onChange({ propName: 'topHitsTimeField', value: topHitsTimeField });
  };

  onTopHitsSizeChange = size => {
    this.props.onChange({ propName: 'topHitsSize', value: size });
  };

  renderTopHitsForm() {
    if (!this.props.useTopHits) {
      return null;
    }

    let timeFieldSelect;
    let sizeSlider;
    if (this.props.topHitsSplitField) {
      timeFieldSelect = (
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esSearch.topHitsTimeFieldLabel', {
            defaultMessage: 'Time'
          })}
        >
          <SingleFieldSelect
            placeholder={i18n.translate('xpack.maps.source.esSearch.topHitsTimeFieldSelectPlaceholder', {
              defaultMessage: 'Select time field'
            })}
            value={this.props.topHitsTimeField}
            onChange={this.onTopHitsTimeFieldChange}
            fields={this.state.dateFields}
          />
        </EuiFormRow>
      );

      sizeSlider = (
        <EuiFormRow
          label={
            i18n.translate('xpack.maps.source.esSearch.topHitsSizeLabel', {
              defaultMessage: 'Documents per entity'
            })
          }
        >
          <ValidatedRange
            min={1}
            max={100}
            step={1}
            value={this.props.topHitsSize}
            onChange={this.onTopHitsSizeChange}
            showLabels
            showInput
            showRange
            data-test-subj="layerPanelTopHitsSize"
          />
        </EuiFormRow>
      );
    }

    return (
      <Fragment>
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esSearch.topHitsSplitFieldLabel', {
            defaultMessage: 'Entity'
          })}
        >
          <SingleFieldSelect
            placeholder={i18n.translate('xpack.maps.source.esSearch.topHitsSplitFieldSelectPlaceholder', {
              defaultMessage: 'Select entity field'
            })}
            value={this.props.topHitsSplitField}
            onChange={this.onTopHitsSplitFieldChange}
            fields={this.state.termFields}
          />
        </EuiFormRow>

        {timeFieldSelect}

        {sizeSlider}
      </Fragment>
    );
  }

  render() {
    return (
      <Fragment>
        <EuiFormRow
          label={
            i18n.translate('xpack.maps.source.esSearch.fieldsLabel', {
              defaultMessage: `Fields to display in tooltip`
            })
          }
        >
          <MultiFieldSelect
            placeholder={i18n.translate('xpack.maps.source.esSearch.fieldsPlaceholder', {
              defaultMessage: `Select fields`
            })
            }
            value={this.props.tooltipProperties}
            onChange={this.onTooltipPropertiesSelect}
            fields={this.state.tooltipFields}
          />
        </EuiFormRow>

        <EuiFormRow>
          <EuiSwitch
            label={
              i18n.translate('xpack.maps.source.esSearch.extentFilterLabel', {
                defaultMessage: `Dynamically filter for data in the visible map area`
              })

            }
            checked={this.props.filterByMapBounds}
            onChange={this.onFilterByMapBoundsChange}
          />
        </EuiFormRow>

        <EuiFormRow>
          <EuiSwitch
            label={
              i18n.translate('xpack.maps.source.esSearch.useTopHitsLabel', {
                defaultMessage: `Show most recent documents by entity`
              })
            }
            checked={this.props.useTopHits}
            onChange={this.onUseTopHitsChange}
          />
        </EuiFormRow>

        {this.renderTopHitsForm()}
      </Fragment>
    );
  }
}
