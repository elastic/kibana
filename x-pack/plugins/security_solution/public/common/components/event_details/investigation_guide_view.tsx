/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTitle, EuiText } from '@elastic/eui';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import React, { createContext, useMemo } from 'react';
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

const InvestigationGuideViewComponent: React.FC<{
  data: TimelineEventsDetailsItem[];
}> = ({ data }) => {
  const ruleId = useMemo(() => {
    const item = data.find((d) => d.field === 'signal.rule.id' || d.field === ALERT_RULE_UUID);
    return Array.isArray(item?.originalValue)
      ? item?.originalValue[0]
      : item?.originalValue ?? null;
  }, [data]);
  const { rule: maybeRule } = useRuleWithFallback(ruleId);
  const basicAlertData = useBasicDataFromDetailsData(data);

  if (!maybeRule?.note) {
    return null;
  }

  return (
    <BasicAlertDataContext.Provider value={basicAlertData}>
      <EuiSpacer size="l" />
      <EuiTitle size="xxxs" data-test-subj="summary-view-guide">
        <h5>{i18n.INVESTIGATION_GUIDE}</h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <Indent>
        <EuiText size="xs">
          <LineClamp lineClampHeight={4.5}>
            <MarkdownRenderer>{maybeRule.note}</MarkdownRenderer>
          </LineClamp>
        </EuiText>
      </Indent>
    </BasicAlertDataContext.Provider>
  );
};

export const InvestigationGuideView = React.memo(InvestigationGuideViewComponent);
