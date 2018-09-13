import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import './advanced_filter.scss';

export const AdvancedFilter = ({ value, onChange, commit }) => (
  <form
    onSubmit={e => {
      e.preventDefault();
      commit(value);
    }}
    className="canvasAdvancedFilter"
  >
    <EuiFlexGroup gutterSize="xs">
      <EuiFlexItem>
        <input
          type="text"
          className="canvasAdvancedFilter__input"
          placeholder="Enter filter expression"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <button
          className="canvasAdvancedFilter__button"
          type="submit"
          onClick={() => commit(value)}
        >
          Apply
        </button>
      </EuiFlexItem>
    </EuiFlexGroup>
  </form>
);

AdvancedFilter.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
  commit: PropTypes.func,
};
