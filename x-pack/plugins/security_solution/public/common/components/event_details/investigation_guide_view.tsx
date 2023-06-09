/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTitle, EuiText } from '@elastic/eui';
import React, { createContext } from 'react';
import styled from 'styled-components';
import type { GetBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';
import { useBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';
import * as i18n from './translations';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { MarkdownRenderer } from '../markdown_editor';
import { LineClamp } from '../line_clamp';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';

export const Indent = styled.div`
  padding: 0 8px;
  word-break: break-word;
`;

export const BasicAlertDataContext = createContext<Partial<GetBasicDataFromDetailsData>>({});

interface InvestigationGuideViewProps {
  /**
   * An array of events data
   */
  data: TimelineEventsDetailsItem[];
  /**
   * Boolean value indicating whether to show the full view of investigation guide, defaults to false and shows partial text
   * with Read more button
   */
  showFullView?: boolean;
  /**
   * Boolean value indicating whether to show investigation guide text title, defaults to true and shows title
   */
  showTitle?: boolean;
}

/**
 * Investigation guide that shows the markdown text of rule.note
 */
const InvestigationGuideViewComponent: React.FC<InvestigationGuideViewProps> = ({
  data,
  showFullView = false,
  showTitle = true,
}) => {
  const basicAlertData = useBasicDataFromDetailsData(data);
  const { rule: maybeRule } = useRuleWithFallback(basicAlertData.ruleId);

  if (!basicAlertData.ruleId || !maybeRule?.note) {
    return null;
  }

  return (
    <BasicAlertDataContext.Provider value={basicAlertData}>
      {showTitle && (
        <>
          <EuiSpacer size="l" />
          <EuiTitle size="xxxs" data-test-subj="summary-view-guide">
            <h5>{i18n.INVESTIGATION_GUIDE}</h5>
          </EuiTitle>
          <EuiSpacer size="s" />
        </>
      )}
      <Indent>
        {showFullView ? (
          <EuiText size="xs" data-test-subj="investigation-guide-full-view">
            <MarkdownRenderer>{maybeRule.note}</MarkdownRenderer>
          </EuiText>
        ) : (
          <EuiText size="xs" data-test-subj="investigation-guide-clamped">
            <LineClamp lineClampHeight={4.5}>
              <MarkdownRenderer>{maybeRule.note}</MarkdownRenderer>
            </LineClamp>
          </EuiText>
        )}
      </Indent>
    </BasicAlertDataContext.Provider>
  );
};

export const InvestigationGuideView = React.memo(InvestigationGuideViewComponent);
