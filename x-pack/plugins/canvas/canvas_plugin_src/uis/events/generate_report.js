/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';

const GenerateReport = () => (
  <EuiText>
    <h3>Generate a Report!</h3>
    <p>
      This data source is connected to every Canvas element by default. Its purpose is to give you
      some playground data to get started. The demo set contains 4 strings, 3 numbers and a date.
      Feel free to experiment and, when you're ready, click <strong>Change your data source</strong>{' '}
      above to connect to your own data.
    </p>
  </EuiText>
);

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
export const generateReport = () => ({
  name: 'generateReport',
  displayName: 'Generate Png Report',
  help: 'Mock data set with usernames, prices, projects, countries, and phases',
  // Replace this with a better icon when we have time.
  image: 'logoElasticStack',
  template: templateFromReactComponent(GenerateReport),
});
