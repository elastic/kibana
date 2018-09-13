import React from 'react';
import PropTypes from 'prop-types';
import { EuiIcon } from '@elastic/eui';
import './dropdown_filter.scss';

export const DropdownFilter = ({ value, onChange, commit, choices }) => {
  const options = [{ value: '%%CANVAS_MATCH_ALL%%', text: '-- ANY --' }];

  choices.forEach(value => options.push({ value: value, text: value }));

  return (
    <div className="canvasDropdownFilter">
      <select
        className="canvasDropdownFilter__select"
        value={value}
        onChange={e => {
          onChange(e.target.value);
          commit(e.target.value);
        }}
      >
        {options.map(({ value, text }) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
      <EuiIcon className="canvasDropdownFilter__icon" type="arrowDown" />
    </div>
  );
};

DropdownFilter.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
  commit: PropTypes.func,
  choices: PropTypes.array,
};
