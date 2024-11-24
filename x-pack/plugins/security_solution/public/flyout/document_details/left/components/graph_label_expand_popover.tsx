/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { GraphPopover } from '@kbn/cloud-security-posture-graph';
import { EuiHorizontalRule, EuiListGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ExpandPopoverListItem } from '@kbn/cloud-security-posture-graph/src/components/styles';
import {
  GRAPH_LABEL_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
  GRAPH_LABEL_POPOVER_VIEW_EVENT_DETAILS_ITEM_ID,
} from './test_ids';

interface GraphLabelExpandPopoverProps {
  isOpen: boolean;
  anchorElement: HTMLElement | null;
  closePopover: () => void;
  onShowEventsWithThisActionClick: () => void;
  onViewEventDetailsClick: () => void;
}

export const GraphLabelExpandPopover: React.FC<GraphLabelExpandPopoverProps> = memo(
  ({
    isOpen,
    anchorElement,
    closePopover,
    onShowEventsWithThisActionClick,
    onViewEventDetailsClick,
  }) => {
    return (
      <GraphPopover
        panelPaddingSize="s"
        anchorPosition="rightCenter"
        isOpen={isOpen}
        anchorElement={anchorElement}
        closePopover={closePopover}
        data-test-subj="graphLabelExpandPopover"
      >
        <EuiListGroup gutterSize="none" bordered={false} flush={true}>
          <ExpandPopoverListItem
            iconType="users"
            label={i18n.translate(
              'xpack.securitySolution.flyout.documentDetails.left.graphLabelExpandPopover.showEventsWithThisAction',
              { defaultMessage: 'Show events with this action' }
            )}
            onClick={onShowEventsWithThisActionClick}
            data-test-subj={GRAPH_LABEL_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID}
          />
          <EuiHorizontalRule margin="xs" />
          <ExpandPopoverListItem
            iconType="expand"
            label={i18n.translate(
              'xpack.securitySolution.flyout.documentDetails.left.graphLabelExpandPopover.showEventDetails',
              { defaultMessage: 'View event details' }
            )}
            onClick={onViewEventDetailsClick}
            data-test-subj={GRAPH_LABEL_POPOVER_VIEW_EVENT_DETAILS_ITEM_ID}
          />
        </EuiListGroup>
      </GraphPopover>
    );
  }
);

GraphLabelExpandPopover.displayName = 'GraphLabelExpandPopover';
