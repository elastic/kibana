/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VFC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { EuiFlexItem, EuiLink } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import { AgentStatus } from '../../../../common/components/endpoint/agents/agent_status';
import { useDocumentDetailsContext } from '../../shared/context';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
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
import { RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD } from '../../../../../common/endpoint/service/response_actions/constants';
import { HostPreviewPanelKey } from '../../../entity_details/host_right';
import { HOST_PREVIEW_BANNER } from './host_entity_overview';
import { UserPreviewPanelKey } from '../../../entity_details/user_right';
import { USER_PREVIEW_BANNER } from './user_entity_overview';

interface LinkFieldCellProps {
  /**
   * Highlighted field's field name
   */
  field: string;
  /**
   * Highlighted field's value to display as a EuiLink to open the expandable left panel
   * (used for host name and username fields)
   */
  value: string;
}

/**
 * // Currently we can use the same component for both host name and username
 */
const LinkFieldCell: VFC<LinkFieldCellProps> = ({ field, value }) => {
  const { scopeId, eventId, indexName } = useDocumentDetailsContext();
  const { openLeftPanel, openPreviewPanel } = useExpandableFlyoutApi();
  const isPreviewEnabled = useIsExperimentalFeatureEnabled('entityAlertPreviewEnabled');

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

  const openHostPreview = useCallback(() => {
    openPreviewPanel({
      id: HostPreviewPanelKey,
      params: {
        hostName: value,
        scopeId,
        banner: HOST_PREVIEW_BANNER,
      },
    });
  }, [openPreviewPanel, value, scopeId]);

  const openUserPreview = useCallback(() => {
    openPreviewPanel({
      id: UserPreviewPanelKey,
      params: {
        userName: value,
        scopeId,
        banner: USER_PREVIEW_BANNER,
      },
    });
  }, [openPreviewPanel, value, scopeId]);

  const onClick = useMemo(() => {
    if (isPreviewEnabled && field === HOST_NAME_FIELD_NAME) {
      return openHostPreview;
    }
    if (isPreviewEnabled && field === USER_NAME_FIELD_NAME) {
      return openUserPreview;
    }
    return goToInsightsEntities;
  }, [isPreviewEnabled, field, openHostPreview, openUserPreview, goToInsightsEntities]);

  return (
    <EuiLink onClick={onClick} data-test-subj={HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID}>
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
  const isSentinelOneAgentIdField = useMemo(
    () => originalField === RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD.sentinel_one,
    [originalField]
  );
  const isCrowdstrikeAgentIdField = useMemo(
    () => originalField === RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD.crowdstrike,
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
                <LinkFieldCell field={field} value={value} />
              ) : field === AGENT_STATUS_FIELD_NAME ? (
                <AgentStatus
                  agentId={String(value ?? '')}
                  agentType={agentType}
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
