/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { calculatePopoverPosition, EuiPortal } from '@elastic/eui';
import * as React from 'react';

import { AutoSizer } from '../../auto_sizer';

const POPOVER_ARROW_SIZE = 12; // px, to position it later

interface SearchMarkerTooltipProps {
  markerPosition: ClientRect;
}

export class SearchMarkerTooltip extends React.PureComponent<SearchMarkerTooltipProps, {}> {
  public render() {
    const { children, markerPosition } = this.props;

    return (
      <EuiPortal>
        <div>
          <AutoSizer content={false} bounds>
            {({ measureRef, bounds: { width, height } }) => {
              const { top, left } =
                width && height
                  ? calculatePopoverPosition(markerPosition, { width, height }, 'left', 16, [
                      'left',
                    ])
                  : {
                      left: -9999, // render off-screen before the first measurement
                      top: 0,
                    };

              return (
                <div
                  className="euiToolTip euiToolTip--left euiToolTipPopover"
                  style={{
                    left,
                    top,
                  }}
                  ref={measureRef}
                >
                  <div
                    className="euiToolTip__arrow"
                    style={{ left: width || 0, top: (height || 0) / 2 - POPOVER_ARROW_SIZE / 2 }}
                  />
                  <div>{children}</div>
                </div>
              );
            }}
          </AutoSizer>
        </div>
      </EuiPortal>
    );
  }
}
