/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VFC } from 'react';
import React, { useCallback } from 'react';
import { EuiFlexItem, EuiLink } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { SentinelOneAgentStatus } from '../../../../detections/components/host_isolation/sentinel_one_agent_status';
import { CrowdstrikeAgentStatus } from '../../../../detections/components/host_isolation/crowdstrike_agent_status';
import { SENTINEL_ONE_AGENT_ID_FIELD } from '../../../../common/utils/sentinelone_alert_check';
import { CROWDSTRIKE_AGENT_ID_FIELD } from '../../../../common/utils/crowdstrike_alert_check';
import { EndpointAgentStatusById } from '../../../../common/components/endpoint/endpoint_agent_status';
import { useRightPanelContext } from '../context';
import {
  AGENT_STATUS_FIELD_NAME,
  HOST_NAME_FIELD_NAME,
  USER_NAME_FIELD_NAME,
} from '../../../../timelines/components/timeline/body/renderers/constants';
import { LeftPanelInsightsTab, DocumentDetailsLeftPanelKey } from '../../left';
import { ENTITIES_TAB_ID } from '../../left/components/entities_details';
import {
  HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID,
  HIGHLIGHTED_FIELDS_BASIC_CELL_TEST_ID,
  HIGHLIGHTED_FIELDS_CELL_TEST_ID,
  HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID,
} from './test_ids';

interface LinkFieldCellProps {
  /**
   * Highlighted field's value to display as a EuiLink to open the expandable left panel
   * (used for host name and username fields)
   */
  value: string;
}

/**
 * // Currently we can use the same component for both host name and username
 */
const LinkFieldCell: VFC<LinkFieldCellProps> = ({ value }) => {
  const { scopeId, eventId, indexName } = useRightPanelContext();
  const { openLeftPanel } = useExpandableFlyoutApi();

  const goToInsightsEntities = useCallback(() => {
    openLeftPanel({
      id: DocumentDetailsLeftPanelKey,
      path: { tab: LeftPanelInsightsTab, subTab: ENTITIES_TAB_ID },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  }, [eventId, indexName, openLeftPanel, scopeId]);

  return (
    <EuiLink onClick={goToInsightsEntities} data-test-subj={HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID}>
      {value}
    </EuiLink>
  );
};

export interface HighlightedFieldsCellProps {
  /**
   * Highlighted field's name used to know what component to display
   */
  field: string;
  /**
   * Highlighted field's original name, when the field is overridden
   */
  originalField?: string;
  /**
   * Highlighted field's value to display
   */
  values: string[] | null | undefined;
}

/**
 * Renders a component in the highlighted fields table cell based on the field name
 */
export const HighlightedFieldsCell: VFC<HighlightedFieldsCellProps> = ({
  values,
  field,
  originalField,
}) => {
  return (
    <>
      {values != null &&
        values.map((value, i) => {
          return (
            <EuiFlexItem
              grow={false}
              key={`${i}-${value}`}
              data-test-subj={`${value}-${HIGHLIGHTED_FIELDS_CELL_TEST_ID}`}
            >
              {field === HOST_NAME_FIELD_NAME || field === USER_NAME_FIELD_NAME ? (
                <LinkFieldCell value={value} />
              ) : field === AGENT_STATUS_FIELD_NAME &&
                originalField === CROWDSTRIKE_AGENT_ID_FIELD ? (
                <CrowdstrikeAgentStatus
                  agentId={String(value ?? '')}
                  data-test-subj={HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID}
                />
              ) : field === AGENT_STATUS_FIELD_NAME &&
                originalField === SENTINEL_ONE_AGENT_ID_FIELD ? (
                <SentinelOneAgentStatus
                  agentId={String(value ?? '')}
                  data-test-subj={HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID}
                />
              ) : field === AGENT_STATUS_FIELD_NAME ? (
                <EndpointAgentStatusById
                  endpointAgentId={String(value ?? '')}
                  data-test-subj={HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID}
                />
              ) : (
                <span data-test-subj={HIGHLIGHTED_FIELDS_BASIC_CELL_TEST_ID}>{value}</span>
              )}
            </EuiFlexItem>
          );
        })}
    </>
  );
};
