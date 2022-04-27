/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlyout, EuiFlyoutFooter, EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import { useKibana } from '../../../common/lib/kibana';
import { OsqueryEventDetailsFooter } from './osquery_flyout_footer';
import { OsqueryEventDetailsHeader } from './osquery_flyout_header';
import { ACTION_OSQUERY } from './translations';

const OsqueryActionWrapper = styled.div`
  padding: 8px;
`;

export interface OsqueryFlyoutProps {
  agentId: string;
  onClose: () => void;
}

export const OsqueryFlyout: React.FC<OsqueryFlyoutProps> = ({ agentId, onClose }) => {
  const {
    services: { osquery },
  } = useKibana();

  // @ts-expect-error
  const { OsqueryAction } = osquery;
  return (
    <EuiFlyout
      ownFocus
      maskProps={{ style: 'z-index: 5000' }} // For an edge case to display above the timeline flyout
      size="m"
      onClose={onClose}
    >
      <EuiFlyoutHeader hasBorder>
        <OsqueryEventDetailsHeader
          primaryText={<h2>{ACTION_OSQUERY}</h2>}
          handleClick={onClose}
          data-test-subj="flyout-header-osquery"
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <OsqueryActionWrapper data-test-subj="flyout-body-osquery">
          <OsqueryAction agentId={agentId} formType="steps" />
        </OsqueryActionWrapper>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <OsqueryEventDetailsFooter handleClick={onClose} data-test-subj="flyout-footer-osquery" />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

OsqueryFlyout.displayName = 'OsqueryFlyout';
