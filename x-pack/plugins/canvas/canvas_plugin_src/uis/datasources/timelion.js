/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiFormRow,
  EuiFieldText,
  EuiCallOut,
  EuiSpacer,
  EuiCode,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { getSimpleArg, setSimpleArg } from '../../../public/lib/arg_helpers';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';

const TimelionDatasource = ({ args, updateArgs }) => {
  const setArg = (name, value) => {
    updateArgs &&
      updateArgs({
        ...args,
        ...setSimpleArg(name, value),
      });
  };

  const getArgName = () => {
    if (getSimpleArg('_', args)[0]) return '_';
    if (getSimpleArg('q', args)[0]) return 'q';
    return 'query';
  };

  const argName = getArgName();

  // TODO: This is a terrible way of doing defaults. We need to find a way to read the defaults for the function
  // and set them for the data source UI.
  const getQuery = () => {
    return getSimpleArg(argName, args)[0] || '.es(*)';
  };

  const getInterval = () => {
    return getSimpleArg('interval', args)[0] || 'auto';
  };

  return (
    <div>
      <EuiText size="xs">
        <h3>Timelion</h3>
        <p>
          Canvas integrates with Kibana's Timelion application to allow you to use Timelion queries
          to pull back timeseries data in a tabular format that can be used with Canvas elements.
        </p>
      </EuiText>

      <EuiSpacer />

      <EuiFormRow label="Query" helpText="Lucene Query String syntax">
        <EuiTextArea
          className="canvasTextArea--code"
          value={getQuery()}
          onChange={e => setArg(argName, e.target.value)}
        />
      </EuiFormRow>
      {
        // TODO: Time timelion interval picker should be a drop down
      }
      <EuiFormRow
        label="Interval"
        helpText="Accepts Elasticsearch date math: 1w, 5d, 10s, or auto"
        compressed
      >
        <EuiFieldText value={getInterval()} onChange={e => setArg('interval', e.target.value)} />
      </EuiFormRow>

      <EuiCallOut color="warning" title="Some tips" size="s">
        <ul>
          <li>
            Timelion requires a time range, you should add a time filter element to your page
            somewhere, or use the code editor to pass in a time filter.
          </li>
          <li>
            Some Timelion functions, such as <EuiCode>.color()</EuiCode>, don't translate to a
            Canvas data table. Anything todo with data manipulation should work grand.
          </li>
        </ul>
      </EuiCallOut>
    </div>
  );
};

TimelionDatasource.propTypes = {
  args: PropTypes.object.isRequired,
  updateArgs: PropTypes.func,
};

export const timelion = () => ({
  name: 'timelion',
  displayName: 'Timelion',
  help: 'Use Timelion syntax to retrieve a timeseries',
  image: 'timelionApp',
  template: templateFromReactComponent(TimelionDatasource),
});
