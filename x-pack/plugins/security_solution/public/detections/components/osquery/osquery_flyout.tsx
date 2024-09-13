/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import {
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useQueryClient } from '@tanstack/react-query';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useKibana } from '../../../common/lib/kibana';
import { OsqueryEventDetailsFooter } from './osquery_flyout_footer';
import { ACTION_OSQUERY } from './translations';

const OsqueryActionWrapper = styled.div`
  padding: 8px;
`;

export interface OsqueryFlyoutProps {
  agentId?: string;
  defaultValues?: {
    alertIds?: string[];
    query?: string;
    ecs_mapping?: { [key: string]: {} };
    queryField?: boolean;
  };
  onClose: () => void;
  ecsData?: Ecs;
}

// Make sure we keep this and ACTIONS_QUERY_KEY in use_all_live_queries.ts in sync.
const ACTIONS_QUERY_KEY = 'actions';

const OsqueryFlyoutComponent: React.FC<OsqueryFlyoutProps> = ({
  agentId,
  defaultValues,
  onClose,
  ecsData,
}) => {
  const { euiTheme } = useEuiTheme();

  // we need this flyout to be above the timeline flyout (which has a z-index of 1002)
  const maskProps = useMemo(
    () => ({ style: `z-index: ${(euiTheme.levels.flyout as number) + 3}` }),
    [euiTheme.levels.flyout]
  );

  const {
    services: { osquery },
  } = useKibana();
  const queryClient = useQueryClient();

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [ACTIONS_QUERY_KEY, { alertId: defaultValues?.alertIds?.[0] }],
    });
  }, [defaultValues?.alertIds, queryClient]);

  const osqueryFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'osqueryFlyoutTitle',
  });

  if (osquery?.OsqueryAction) {
    return (
      <EuiFlyout
        size="m"
        onClose={onClose}
        aria-labelledby={osqueryFlyoutTitleId}
        // EUI TODO: This z-index override of EuiOverlayMask is a workaround, and ideally should be resolved with a cleaner UI/UX flow long-term
        maskProps={maskProps}
      >
        <EuiFlyoutHeader hasBorder data-test-subj="flyout-header-osquery">
          <EuiTitle>
            <h2 id={osqueryFlyoutTitleId}>{ACTION_OSQUERY}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <OsqueryActionWrapper data-test-subj="flyout-body-osquery">
            <osquery.OsqueryAction
              agentId={agentId}
              formType="steps"
              defaultValues={defaultValues}
              ecsData={ecsData}
              onSuccess={invalidateQueries}
            />
          </OsqueryActionWrapper>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <OsqueryEventDetailsFooter handleClick={onClose} data-test-subj="flyout-footer-osquery" />
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }

  return null;
};

export const OsqueryFlyout = React.memo(OsqueryFlyoutComponent);
