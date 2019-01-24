/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import PropTypes from 'prop-types';
import React, { ChangeEvent, FocusEvent, SFC } from 'react';
import './dropdown_filter.scss';

export interface Props {
  value?: string;
  onChange: (value: string) => void;
  commit: (value: string) => void;
  choices?: string[];
}

export const DropdownFilter: SFC<Props> = ({ value, onChange, commit, choices = [] }) => {
  choices = choices || [];

  // Prepend the choices with the value provided if it isn't in the choices array.
  if (value && !choices.includes(value)) {
    choices = [value].concat(choices);
  }

  let options = [{ value: '%%CANVAS_MATCH_ALL%%', text: '-- ANY --' }];
  options = options.concat(choices.map(choice => ({ value: choice, text: choice })));

  const changeHandler = (e: FocusEvent<HTMLSelectElement> | ChangeEvent<HTMLSelectElement>) => {
    if (e && e.target) {
      const target = e.target as HTMLSelectElement;
      onChange(target.value);
      commit(target.value);
    }
  };

  const dropdownOptions = options.map(option => {
    const { text } = option;
    const optionValue = option.value;
    const selected = optionValue === value;

    return (
      <option key={optionValue} value={optionValue} aria-selected={selected}>
        {text}
      </option>
    );
  });

  /* tslint:disable:react-a11y-no-onchange */
  return (
    <div className="canvasDropdownFilter">
      <select className="canvasDropdownFilter__select" value={value} onChange={changeHandler}>
        {dropdownOptions}
      </select>
      <EuiIcon className="canvasDropdownFilter__icon" type="arrowDown" />
    </div>
  );
};

DropdownFilter.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
  commit: PropTypes.func.isRequired,
  choices: PropTypes.array,
};
