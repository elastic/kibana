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

import { indexPatternService } from '../../../../kibana_services';

export class UpdateSourceEditor extends Component {

  static propTypes = {
    indexPatternId: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    filterByMapBounds: PropTypes.bool.isRequired,
    tooltipProperties: PropTypes.arrayOf(PropTypes.string).isRequired,
  }

  state = {
    fields: null,
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
          loadError: `Unable to find Index pattern ${this.props.indexPatternId}`
        });
      }
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({ fields: indexPattern.fields });
  }

  onTooltipPropertiesSelect = (propertyNames) => {
    this.props.onChange({ propName: 'tooltipProperties', value: propertyNames });
  };

  onFilterByMapBoundsChange = event => {
    this.props.onChange({ propName: 'filterByMapBounds', value: event.target.checked });
  };

  render() {
    return (
      <Fragment>
        <EuiFormRow
          label="Fields to display in tooltip"
        >
          <MultiFieldSelect
            placeholder="Select fields"
            value={this.props.tooltipProperties}
            onChange={this.onTooltipPropertiesSelect}
            fields={this.state.fields}
          />
        </EuiFormRow>

        <EuiFormRow>
          <EuiSwitch
            label="Only filter for data in the visible map area"
            checked={this.props.filterByMapBounds}
            onChange={this.onFilterByMapBoundsChange}
          />
        </EuiFormRow>
      </Fragment>
    );
  }
}
