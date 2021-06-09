/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiBadge, EuiTextColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export interface EndpointHostIsolationStatusProps {
  isIsolated: boolean;
  /** the count of pending isolate actions */
  pendingIsolate?: number;
  /** the count of pending unisoalte actions */
  pendingUnIsolate?: number;
}

/**
 * Component will display a host isoaltion status based on whether it is currently isolated or there are
 * isolate/unisolate actions pending. If none of these are applicable, no UI component will be rendered
 * (`null` is returned)
 */
export const EndpointHostIsolationStatus = memo<EndpointHostIsolationStatusProps>(
  ({ isIsolated, pendingIsolate = 0, pendingUnIsolate = 0 }) => {
    return useMemo(() => {
      // If nothing is pending and host is not currently isolated, then render nothing
      if (!isIsolated && !pendingIsolate && !pendingUnIsolate) {
        return null;
      }

      // If nothing is pending, but host is isolated, then show isolation badge
      if (!pendingIsolate && !pendingUnIsolate) {
        return (
          <EuiBadge color="hollow">
            <FormattedMessage
              id="xpack.securitySolution.endpoint.hostIsolationStatus.isolated"
              defaultMessage="Isolated"
            />
          </EuiBadge>
        );
      }

      // If there are multiple types of pending isolation actions, then show count of actions with tooltip that displays breakdown
      // TODO:PT implement edge case
      // if () {
      //
      // }

      // Show 'pending [un]isolate' depending on what's pending
      return (
        <EuiBadge color="hollow">
          <EuiTextColor color="subdued">
            {pendingIsolate ? (
              <FormattedMessage
                id="xpack.securitySolution.endpoint.hostIsolationStatus.isIsolating"
                defaultMessage="Isolating pending"
              />
            ) : (
              <FormattedMessage
                id="xpack.securitySolution.endpoint.hostIsolationStatus.isUnIsolating"
                defaultMessage="Unisolating pending"
              />
            )}
          </EuiTextColor>
        </EuiBadge>
      );
    }, [isIsolated, pendingIsolate, pendingUnIsolate]);
  }
);

EndpointHostIsolationStatus.displayName = 'EndpointHostIsolationStatus';
