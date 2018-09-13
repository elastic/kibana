import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';

export const Tray = ({ children, done }) => {
  return (
    <Fragment>
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon size="s" onClick={done} aria-label="Dismiss tray" iconType="arrowDown" />
        </EuiFlexItem>
      </EuiFlexGroup>

      <div className="canvasTray">{children}</div>
    </Fragment>
  );
};

Tray.propTypes = {
  children: PropTypes.node,
  done: PropTypes.func,
};
