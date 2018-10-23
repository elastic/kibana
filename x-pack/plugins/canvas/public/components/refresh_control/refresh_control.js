/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { EuiButtonEmpty, EuiLoadingSpinner } from '@elastic/eui';
import { Popover } from '../popover';
import { AutoRefreshControls } from './auto_refresh_controls';

const getRefreshInterval = (val = '') => {
  // if it's a number, just use it directly
  if (!isNaN(Number(val))) return val;

  // if it's a string, try to parse out the shorthand duration value
  const match = String(val).match(/^([0-9]{1,})([hmsd])$/);

  // TODO: do something better with improper input, like show an error...
  if (!match) return;

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

export const RefreshControl = ({ inFlight, setRefreshInterval, refreshInterval, doRefresh }) => {
  const setRefresh = val => setRefreshInterval(getRefreshInterval(val));

  const popoverButton = handleClick => (
    <EuiButtonEmpty size="s" onClick={handleClick}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {inFlight && (
          <Fragment>
            <EuiLoadingSpinner size="m" /> &nbsp;
          </Fragment>
        )}
        Refresh
      </div>
    </EuiButtonEmpty>
  );

  const autoRefreshControls = (
    <Popover
      id="auto-refresh-popover"
      button={popoverButton}
      panelClassName="canvasRefreshControl__popover"
    >
      {({ closePopover }) => (
        <div>
          <AutoRefreshControls
            inFlight={inFlight}
            refreshInterval={refreshInterval}
            setRefresh={val => {
              setRefresh(val);
              closePopover();
            }}
            doRefresh={doRefresh}
            disableInterval={() => {
              setRefresh(0);
              closePopover();
            }}
          />
        </div>
      )}
    </Popover>
  );

  return autoRefreshControls;
};

RefreshControl.propTypes = {
  inFlight: PropTypes.bool.isRequired,
  doRefresh: PropTypes.func.isRequired,
  refreshInterval: PropTypes.number,
  setRefreshInterval: PropTypes.func.isRequired,
};
