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
import { TooltipSelector } from '../../../components/tooltip_selector';

import { indexPatternService } from '../../../../kibana_services';
import { i18n } from '@kbn/i18n';

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
        //todo: use this loaderror in UX
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

    this.setState({
      fields: indexPattern.fields.filter(field => {
        // Do not show multi fields as tooltip field options
        // since they do not have values in _source and exist for indexing only
        return field.subType !== 'multi';
      })
    });
  }

  _onTooltipPropertiesSelect = (propertyNames) => {
    this.props.onChange({ propName: 'tooltipProperties', value: propertyNames });
  };

  _onFilterByMapBoundsChange = event => {
    this.props.onChange({ propName: 'filterByMapBounds', value: event.target.checked });
  };

  render() {
    return (
      <Fragment>
        <TooltipSelector
          tooltipProperties={this.props.tooltipProperties}
          onChange={this._onTooltipPropertiesSelect}
          fields={this.state.fields}
        />

        <EuiFormRow>
          <EuiSwitch
            label={
              i18n.translate('xpack.maps.source.esSearch.extentFilterLabel', {
                defaultMessage: `Dynamically filter for data in the visible map area.`
              })
            }
            checked={this.props.filterByMapBounds}
            onChange={this._onFilterByMapBoundsChange}
          />
        </EuiFormRow>
      </Fragment>
    );
  }
}
