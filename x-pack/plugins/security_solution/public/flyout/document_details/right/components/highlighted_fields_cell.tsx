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
import { getAgentTypeForAgentIdField } from '../../../../common/lib/endpoint/utils/get_agent_type_for_agent_id_field';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import { AgentStatus } from '../../../../common/components/endpoint/agents/agent_status';
import { useDocumentDetailsContext } from '../../shared/context';
import { AGENT_STATUS_FIELD_NAME } from '../../../../timelines/components/timeline/body/renderers/constants';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { LeftPanelInsightsTab } from '../../left';
import { ENTITIES_TAB_ID } from '../../left/components/entities_details';
import {
  HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID,
  HIGHLIGHTED_FIELDS_BASIC_CELL_TEST_ID,
  HIGHLIGHTED_FIELDS_CELL_TEST_ID,
  HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID,
} from './test_ids';
import { hasPreview, PreviewLink } from '../../../shared/components/preview_link';

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
  originalField = '',
}) => {
  const { scopeId, eventId, indexName } = useDocumentDetailsContext();
  const { openLeftPanel } = useExpandableFlyoutApi();
  const isPreviewEnabled = !useIsExperimentalFeatureEnabled('entityAlertPreviewDisabled');

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

  const agentType: ResponseActionAgentType = useMemo(() => {
    return getAgentTypeForAgentIdField(originalField);
  }, [originalField]);

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
              {isPreviewEnabled && hasPreview(field) ? (
                <PreviewLink
                  field={field}
                  value={value}
                  scopeId={scopeId}
                  data-test-subj={HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID}
                />
              ) : hasPreview(field) ? (
                <EuiLink
                  onClick={goToInsightsEntities}
                  data-test-subj={HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID}
                >
                  {value}
                </EuiLink>
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
