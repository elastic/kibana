/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { EuiFormRow, EuiTextArea } from '@elastic/eui';
import { getSimpleArg, setSimpleArg } from '../../../public/lib/arg_helpers';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';

class EssqlDatasource extends PureComponent {
  componentDidMount() {
    const query = this.getQuery();
    if (typeof query !== 'string') this.setArg(this.getArgName(), this.defaultQuery);
    else this.props.setInvalid(!query.trim());
  }

  defaultQuery = 'SELECT * FROM logstash*';

  getQuery = () => getSimpleArg(this.getArgName(), this.props.args)[0];

  // TODO: This is a terrible way of doing defaults. We need to find a way to read the defaults for the function
  // and set them for the data source UI.
  getArgName = () => {
    const { args } = this.props;
    if (getSimpleArg('_', args)[0]) return '_';
    if (getSimpleArg('q', args)[0]) return 'q';
    return 'query';
  };

  setArg = (name, value) => {
    const { args, updateArgs } = this.props;
    updateArgs &&
      updateArgs({
        ...args,
        ...setSimpleArg(name, value),
      });
  };

  onChange = e => {
    const { value } = e.target;
    this.props.setInvalid(!value.trim());
    this.setArg(this.getArgName(), value);
  };

  render() {
    const { isInvalid } = this.props;
    return (
      <EuiFormRow isInvalid={isInvalid} label="Elasticsearch SQL query">
        <EuiTextArea
          placeholder={this.defaultQuery}
          isInvalid={isInvalid}
          className="canvasTextArea--code"
          value={this.getQuery()}
          onChange={this.onChange}
        />
      </EuiFormRow>
    );
  }
}

EssqlDatasource.propTypes = {
  args: PropTypes.object.isRequired,
  updateArgs: PropTypes.func,
  isInvalid: PropTypes.bool,
  setInvalid: PropTypes.func,
};

export const essql = () => ({
  name: 'essql',
  displayName: 'Elasticsearch SQL',
  help: 'Use Elasticsearch SQL to get a data table',
  // Replace this with a SQL logo when we have one in EUI
  image: 'logoElasticsearch',
  template: templateFromReactComponent(EssqlDatasource),
});
