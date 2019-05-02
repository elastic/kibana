/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import { Popover } from '../../popover';
import { AutoRefreshControls } from './auto_refresh_controls';

const getRefreshInterval = (val = '') => {
  // if it's a number, just use it directly
  if (!isNaN(Number(val))) {
    return val;
  }

  // if it's a string, try to parse out the shorthand duration value
  const match = String(val).match(/^([0-9]{1,})([hmsd])$/);

  // TODO: do something better with improper input, like show an error...
  if (!match) {
    return;
  }

  switch (match[2]) {
    case 's':
      return match[1] * 1000;
    case 'm':
      return match[1] * 1000 * 60;
    case 'h':
      return match[1] * 1000 * 60 * 60;
    case 'd':
      return match[1] * 1000 * 60 * 60 * 24;
  }
};

export const ControlSettings = ({ setRefreshInterval, refreshInterval }) => {
  const setRefresh = val => setRefreshInterval(getRefreshInterval(val));

  const disableInterval = () => {
    setRefresh(0);
  };

  const popoverButton = handleClick => (
    <EuiButtonIcon iconType="gear" aria-label="Control settings" onClick={handleClick} />
  );

  return (
    <Popover
      id="auto-refresh-popover"
      button={popoverButton}
      anchorPosition="rightUp"
      panelClassName="canvasControlSettings__popover"
    >
      {({ closePopover }) => (
        <EuiFlexGroup>
          <EuiFlexItem>
            <AutoRefreshControls
              refreshInterval={refreshInterval}
              setRefresh={val => {
                setRefresh(val);
                closePopover();
              }}
              disableInterval={() => {
                disableInterval();
                closePopover();
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </Popover>
  );
};

ControlSettings.propTypes = {
  refreshInterval: PropTypes.number,
  setRefreshInterval: PropTypes.func.isRequired,
};
