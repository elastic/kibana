/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlyout, EuiFlyoutFooter, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { useHandleAddToTimeline } from '../../../common/components/event_details/add_to_timeline_button';
import { useKibana } from '../../../common/lib/kibana';
import { OsqueryEventDetailsFooter } from './osquery_flyout_footer';
import { ACTION_OSQUERY } from './translations';
import type { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';

const OsqueryActionWrapper = styled.div`
  padding: 8px;
`;

export interface OsqueryFlyoutProps {
  agentId: string;
  onClose: () => void;
}

export const OsqueryFlyoutComponent: React.FC<OsqueryFlyoutProps> = ({ agentId, onClose }) => {
  const {
    services: { osquery },
  } = useKibana();

  const handleAddToTimeline = useHandleAddToTimeline();

  // @ts-expect-error
  const { OsqueryAction } = osquery;
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
          <OsqueryAction agentId={agentId} formType="steps" addToTimeline={handleAddToTimeline} />
        </OsqueryActionWrapper>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <OsqueryEventDetailsFooter handleClick={onClose} data-test-subj="flyout-footer-osquery" />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const OsqueryFlyout = React.memo(OsqueryFlyoutComponent);
