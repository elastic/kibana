/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculatePopoverPosition, EuiPortal, withEuiTheme, WithEuiThemeProps } from '@elastic/eui';
// @ts-expect-error style types not defined
import { euiToolTipStyles } from '@elastic/eui/lib/components/tool_tip/tool_tip.styles';
import { css } from '@emotion/react';
import * as React from 'react';

import { AutoSizer } from '../../auto_sizer';

const POPOVER_ARROW_SIZE = 12; // px, to position it later

interface SearchMarkerTooltipProps {
  markerPosition: ClientRect;
  children: React.ReactNode;
}

export class _SearchMarkerTooltip extends React.PureComponent<
  SearchMarkerTooltipProps & WithEuiThemeProps
> {
  public render() {
    const { children, markerPosition, theme } = this.props;
    const styles = euiToolTipStyles(theme);

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
                  css={css([styles.euiToolTip, styles.left])}
                  style={{
                    left,
                    top,
                  }}
                  ref={measureRef}
                >
                  <div
                    css={css([styles.euiToolTip__arrow, styles.arrowPositions.left])}
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

export const SearchMarkerTooltip = withEuiTheme<SearchMarkerTooltipProps>(_SearchMarkerTooltip);
