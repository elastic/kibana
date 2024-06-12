/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VFC } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { EuiFlexItem, EuiLink } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { SENTINEL_ONE_AGENT_ID_FIELD } from '../../../../common/utils/sentinelone_alert_check';
import {
  AgentStatus,
  EndpointAgentStatusById,
} from '../../../../common/components/agents/agent_status';
import { CROWDSTRIKE_AGENT_ID_FIELD } from '../../../../common/utils/crowdstrike_alert_check';
import { useRightPanelContext } from '../context';
import {
  AGENT_STATUS_FIELD_NAME,
  HOST_NAME_FIELD_NAME,
  USER_NAME_FIELD_NAME,
} from '../../../../timelines/components/timeline/body/renderers/constants';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { LeftPanelInsightsTab } from '../../left';
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

const FieldsAgentStatus = memo(
  ({ value, agentType }: { value: string | undefined; agentType: ResponseActionAgentType }) => {
    const agentStatusClientEnabled = useIsExperimentalFeatureEnabled('agentStatusClientEnabled');
    if (agentType !== 'endpoint' || agentStatusClientEnabled) {
      return (
        <AgentStatus
          agentId={String(value ?? '')}
          agentType={agentType}
          data-test-subj={HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID}
        />
      );
    } else {
      // TODO: remove usage of `EndpointAgentStatusById` when `agentStatusClientEnabled` FF is enabled and removed
      return (
        <EndpointAgentStatusById
          endpointAgentId={String(value ?? '')}
          data-test-subj={HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID}
        />
      );
    }
  }
);

FieldsAgentStatus.displayName = 'FieldsAgentStatus';

/**
 * console.log('c::*, values != null
 * Renders a component in the highlighted fields table cell based on the field name
 */
export const HighlightedFieldsCell: VFC<HighlightedFieldsCellProps> = ({
  values,
  field,
  originalField,
}) => {
  const isSentinelOneAgentIdField = useMemo(
    () => originalField === SENTINEL_ONE_AGENT_ID_FIELD,
    [originalField]
  );
  const isCrowdstrikeAgentIdField = useMemo(
    () => originalField === CROWDSTRIKE_AGENT_ID_FIELD,
    [originalField]
  );
  const agentType: ResponseActionAgentType = useMemo(() => {
    if (isSentinelOneAgentIdField) {
      return 'sentinel_one';
    }
    if (isCrowdstrikeAgentIdField) {
      return 'crowdstrike';
    }
    return 'endpoint';
  }, [isCrowdstrikeAgentIdField, isSentinelOneAgentIdField]);

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
              ) : field === AGENT_STATUS_FIELD_NAME ? (
                <FieldsAgentStatus value={value} agentType={agentType} />
              ) : (
                <span data-test-subj={HIGHLIGHTED_FIELDS_BASIC_CELL_TEST_ID}>{value}</span>
              )}
            </EuiFlexItem>
          );
        })}
    </>
  );
};
