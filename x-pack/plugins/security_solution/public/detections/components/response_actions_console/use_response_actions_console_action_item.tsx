/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

export const useResponseActionsConsoleActionItem = (): JSX.Element[] => {
  const isResponseActionsConsoleEnabled = useIsExperimentalFeatureEnabled(
    'responseActionsConsoleEnabled'
  );

  const handleResponseActionsClick = useCallback(() => {
    //
  }, []);

  return useMemo(() => {
    const actions: JSX.Element[] = [];

    if (isResponseActionsConsoleEnabled) {
      actions.push(
        <EuiContextMenuItem
          key="endpointResponseActions-action-item"
          data-test-subj="endpointResponseActions-action-item"
          disabled={false} // FIXME:PT agentStatus === HostStatus.UNENROLLED
          onClick={handleResponseActionsClick}
        >
          <FormattedMessage
            id="xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole"
            defaultMessage="Response actions"
          />
        </EuiContextMenuItem>
      );
    }

    return actions;
  }, [handleResponseActionsClick, isResponseActionsConsoleEnabled]);
};
