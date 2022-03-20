/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { EuiSelect, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { sortBy } from 'lodash';
import { getType } from '@kbn/interpreter';
import { templateFromReactComponent } from '../../../../public/lib/template_from_react_component';
import { ArgumentStrings } from '../../../../i18n';
import { SimpleMathFunction } from './simple_math_function';
import { getFormObject } from './get_form_object';

const { DataColumn: strings } = ArgumentStrings;

const maybeQuoteValue = (val) => (val.match(/\s/) ? `'${val}'` : val);
const valueNotSet = (val) => !val || val.length === 0;

const getMathValue = (argValue, columns) => {
  if (getType(argValue) !== 'string') {
    return { error: 'argValue is not a string type' };
  }
  try {
    const matchedCol = columns.find(({ name }) => argValue === name);
    const val = matchedCol ? maybeQuoteValue(matchedCol.name) : argValue;
    const mathValue = getFormObject(val);

    const validColumn = columns.some(({ name }) => mathValue.column === name);
    return { ...mathValue, column: validColumn ? mathValue.column : '' };
  } catch (e) {
    return { error: e.message };
  }
};

// TODO: Garbage, we could make a much nicer math form that can handle way more.
const DatacolumnArgInput = ({
  onValueChange,
  resolved: { columns },
  argValue,
  renderError,
  argId,
  typeInstance,
}) => {
  const [mathValue, setMathValue] = useState(getMathValue(argValue, columns));

  useEffect(() => {
    setMathValue(getMathValue(argValue, columns));
  }, [argValue, columns]);

  const allowedTypes = typeInstance.options.allowedTypes || false;
  const onlyShowMathFunctions = typeInstance.options.onlyMath || false;

  const updateFunctionValue = useCallback(
    (fn, column) => {
      // if setting size, auto-select the first column if no column is already set
      if (fn === 'size') {
        const col = column || (columns[0] && columns[0].name) || '';
        if (col) {
          return onValueChange(`${fn}(${maybeQuoteValue(col)})`);
        }
      }

      // if there is no column value, do nothing
      if (valueNotSet(column)) {
        return setMathValue({ ...mathValue, fn });
      }

      // if fn is not set, just use the value input
      if (valueNotSet(fn)) {
        return onValueChange(column);
      }

      // fn has a value, so use it as a math.js expression
      onValueChange(`${fn}(${maybeQuoteValue(column)})`);
    },
    [mathValue, onValueChange, columns]
  );

  const onChangeFn = useCallback(
    ({ target: { value } }) => updateFunctionValue(value, mathValue.column),
    [mathValue.column, updateFunctionValue]
  );

  const onChangeColumn = useCallback(
    ({ target: { value } }) => updateFunctionValue(mathValue.fn, value),
    [mathValue.fn, updateFunctionValue]
  );

  if (mathValue.error) {
    renderError();
    return null;
  }

  const firstColumnOption = { value: '', text: 'select column', disabled: true };
  const options = sortBy(columns, 'name')
    .filter((column) => !allowedTypes || allowedTypes.includes(column.type))
    .map(({ name }) => ({ value: name, text: name }));

  return (
    <EuiFlexGroup gutterSize="s" id={argId} direction="row">
      <EuiFlexItem grow={false}>
        <SimpleMathFunction
          id={argId}
          value={mathValue.fn}
          onlymath={onlyShowMathFunctions}
          onChange={onChangeFn}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSelect
          compressed
          options={[firstColumnOption, ...options]}
          value={mathValue.column}
          onChange={onChangeColumn}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

DatacolumnArgInput.propTypes = {
  resolved: PropTypes.shape({
    columns: PropTypes.array.isRequired,
  }).isRequired,
  onValueChange: PropTypes.func.isRequired,
  typeInstance: PropTypes.object.isRequired,
  renderError: PropTypes.func.isRequired,
  argId: PropTypes.string.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
};

export const datacolumn = () => ({
  name: 'datacolumn',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  default: '""',
  simpleTemplate: templateFromReactComponent(DatacolumnArgInput),
});
