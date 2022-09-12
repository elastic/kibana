/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import styled from 'styled-components';
import {
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiButtonEmpty,
  EuiTitle,
} from '@elastic/eui';
import { useKibana } from '../../../common/lib/kibana';
import { OsqueryEventDetailsFooter } from './osquery_flyout_footer';
import { ACTION_OSQUERY } from './translations';
import type { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';

const OsqueryActionWrapper = styled.div`
  padding: 8px;
`;

export interface OsqueryFlyoutProps {
  agentId?: string;
  defaultValues?: {};
  onClose: () => void;
}

const TimelineComponent = React.memo((props) => <EuiButtonEmpty {...props} size="xs" />);
TimelineComponent.displayName = 'TimelineComponent';

export const OsqueryFlyoutComponent: React.FC<OsqueryFlyoutProps> = ({
  agentId,
  defaultValues,
  onClose,
}) => {
  const {
    services: { osquery, timelines },
  } = useKibana();

  const { getAddToTimelineButton } = timelines.getHoverActions();

  const handleAddToTimeline = useCallback(
    (payload: { query: [string, string]; isIcon?: true }) => {
      const {
        query: [field, value],
        isIcon,
      } = payload;
      const providerA: DataProvider = {
        and: [],
        enabled: true,
        excluded: false,
        id: value,
        kqlQuery: '',
        name: value,
        queryMatch: {
          field,
          value,
          operator: ':',
        },
      };

      return getAddToTimelineButton({
        dataProvider: providerA,
        field: value,
        ownFocus: false,
        ...(isIcon ? { showTooltip: true } : { Component: TimelineComponent }),
      });
    },
    [getAddToTimelineButton]
  );

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
              addToTimeline={handleAddToTimeline}
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
