/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import { TooltipSelector } from '../../../components/tooltip_selector';
import { getEmsVectorFilesMeta } from '../../../../meta';

export class UpdateSourceEditor extends Component {

  static propTypes = {
    onChange: PropTypes.func.isRequired,
    tooltipProperties: PropTypes.arrayOf(PropTypes.string).isRequired
  };

  state = {
    fields: null,
  };

  componentDidMount() {
    this._isMounted = true;
    this.loadFields();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async loadFields() {
    const emsFiles = await getEmsVectorFilesMeta();
    const meta = emsFiles.find((source => source.id === this.props.layerId));
    const fields = meta.fields.map(field => {
      return {
        type: 'string',
        name: field.name
      };
    });
    this.setState({ fields: fields });
  }

  _onTooltipPropertiesSelect = (propertyNames) => {
    this.props.onChange({ propName: 'tooltipProperties', value: propertyNames });
  };

  render() {
    return (
      <Fragment>
        <TooltipSelector
          tooltipProperties={this.props.tooltipProperties}
          onChange={this._onTooltipPropertiesSelect}
          fields={this.state.fields}
        />
      </Fragment>
    );
  }
}
