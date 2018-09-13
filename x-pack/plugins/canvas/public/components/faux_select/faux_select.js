import React from 'react';
import { PropTypes } from 'prop-types';
import { EuiIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

//TODO: remove this when EUI has a better select component
export const FauxSelect = ({ handleClick, children }) => (
  <EuiFlexGroup
    gutterSize="none"
    alignItems="center"
    justifyContent="spaceBetween"
    className="euiSelect  euiSelect--compressed euiSelect--fullWidth"
    style={{ padding: 12 }} // match padding with EuiSelect
    onClick={handleClick}
  >
    <EuiFlexItem>{children}</EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIcon type="arrowDown" />
    </EuiFlexItem>
  </EuiFlexGroup>
);

FauxSelect.propTypes = {
  handleClick: PropTypes.func,
  children: PropTypes.node,
};
