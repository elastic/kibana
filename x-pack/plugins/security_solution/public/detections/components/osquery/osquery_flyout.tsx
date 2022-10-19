/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlyout, EuiFlyoutFooter, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import type { Ecs } from '../../../../common/ecs';
import { useKibana } from '../../../common/lib/kibana';
import { OsqueryEventDetailsFooter } from './osquery_flyout_footer';
import { ACTION_OSQUERY } from './translations';

const OsqueryActionWrapper = styled.div`
  padding: 8px;
`;

export interface OsqueryFlyoutProps {
  agentId?: string;
  defaultValues?: {};
  onClose: () => void;
  ecsData?: Ecs;
}

const OsqueryFlyoutComponent: React.FC<OsqueryFlyoutProps> = ({
  agentId,
  defaultValues,
  onClose,
  ecsData,
}) => {
  const {
    services: { osquery },
  } = useKibana();

  if (osquery?.OsqueryAction) {
    return (
      <EuiFlyout
        ownFocus
        maskProps={{ style: 'z-index: 5000' }} // For an edge case to display above the timeline flyout
        size="m"
        onClose={onClose}
      >
        <EuiFlyoutHeader hasBorder data-test-subj="flyout-header-osquery">
          <EuiTitle>
            <h2>{ACTION_OSQUERY}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <OsqueryActionWrapper data-test-subj="flyout-body-osquery">
            <osquery.OsqueryAction
              agentId={agentId}
              formType="steps"
              defaultValues={defaultValues}
              ecsData={ecsData}
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
