/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import { set, del } from 'object-path-immutable';
import { get } from 'lodash';

export const ExtendedTemplate = props => {
  const { typeInstance, onValueChange, labels, argValue } = props;
  const chain = get(argValue, 'chain.0', {});
  const chainArgs = get(chain, 'arguments', {});
  const selectedSeries = get(chainArgs, 'label.0', '');
  const { name } = typeInstance;
  const fields = get(typeInstance, 'options.include', []);
  const hasPropFields = fields.some(field => ['lines', 'bars', 'points'].indexOf(field) !== -1);

  const handleChange = (argName, ev) => {
    const fn = ev.target.value === '' ? del : set;

    const newValue = fn(argValue, ['chain', 0, 'arguments', argName], [ev.target.value]);
    return onValueChange(newValue);
  };

  // TODO: add fill and stack options
  // TODO: add label name auto-complete
  const values = [
    { value: 0, text: 'None' },
    { value: 1, text: '1' },
    { value: 2, text: '2' },
    { value: 3, text: '3' },
    { value: 4, text: '4' },
    { value: 5, text: '5' },
  ];

  const labelOptions = [{ value: '', text: 'Select Series' }];
  labels.sort().forEach(val => labelOptions.push({ value: val, text: val }));

  return (
    <div>
      {name !== 'defaultStyle' && (
        <EuiFormRow label="Series Identifier" compressed>
          <EuiSelect
            value={selectedSeries}
            options={labelOptions}
            onChange={ev => handleChange('label', ev)}
          />
        </EuiFormRow>
      )}
      {hasPropFields && (
        <EuiFlexGroup gutterSize="s">
          {fields.includes('lines') && (
            <EuiFlexItem>
              <EuiFormRow label="Line" compressed>
                <EuiSelect
                  value={get(chainArgs, 'lines.0', 0)}
                  options={values}
                  onChange={ev => handleChange('lines', ev)}
                />
              </EuiFormRow>
            </EuiFlexItem>
          )}
          {fields.includes('bars') && (
            <EuiFlexItem>
              <EuiFormRow label="Bar" compressed>
                <EuiSelect
                  value={get(chainArgs, 'bars.0', 0)}
                  options={values}
                  onChange={ev => handleChange('bars', ev)}
                />
              </EuiFormRow>
            </EuiFlexItem>
          )}
          {fields.includes('points') && (
            <EuiFlexItem>
              <EuiFormRow label="Point" compressed>
                <EuiSelect
                  value={get(chainArgs, 'points.0', 0)}
                  options={values}
                  onChange={ev => handleChange('points', ev)}
                />
              </EuiFormRow>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
    </div>
  );
};

ExtendedTemplate.displayName = 'SeriesStyleArgAdvancedInput';

ExtendedTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  typeInstance: PropTypes.object,
  labels: PropTypes.array.isRequired,
  renderError: PropTypes.func,
};
