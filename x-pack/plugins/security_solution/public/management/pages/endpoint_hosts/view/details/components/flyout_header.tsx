/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlyoutHeader, EuiSkeletonText, EuiToolTip, EuiTitle } from '@elastic/eui';
import { BackToEndpointDetailsFlyoutSubHeader } from './back_to_endpoint_details_flyout_subheader';

export const EndpointDetailsFlyoutHeader = memo(
  ({
    endpointId,
    hasBorder = false,
    isHostDetailsLoading,
    hostname,
    children,
  }: {
    endpointId?: string;
    hasBorder?: boolean;
    isHostDetailsLoading: boolean;
    hostname?: string;
    children?: React.ReactNode | React.ReactNode[];
  }) => {
    return (
      <EuiFlyoutHeader hasBorder={hasBorder}>
        {endpointId && <BackToEndpointDetailsFlyoutSubHeader endpointId={endpointId} />}

        {isHostDetailsLoading ? (
          <EuiSkeletonText lines={1} />
        ) : (
          <EuiToolTip content={hostname} anchorClassName="eui-textTruncate">
            <EuiTitle size="s">
              <h2
                style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                data-test-subj="endpointDetailsFlyoutTitle"
              >
                {hostname}
              </h2>
            </EuiTitle>
          </EuiToolTip>
        )}
        {children}
      </EuiFlyoutHeader>
    );
  }
);

EndpointDetailsFlyoutHeader.displayName = 'EndpointDetailsFlyoutHeader';
