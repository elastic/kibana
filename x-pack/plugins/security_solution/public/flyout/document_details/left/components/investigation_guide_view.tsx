/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTitle, EuiText } from '@elastic/eui';
import React, { createContext } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import type { UseBasicDataFromDetailsDataResult } from '../../shared/hooks/use_basic_data_from_details_data';
import { LineClamp } from '../../../../common/components/line_clamp';
import { MarkdownRenderer } from '../../../../common/components/markdown_editor';

const INVESTIGATION_GUIDE = i18n.translate(
  'xpack.securitySolution.flyout.left.investigationGuide',
  {
    defaultMessage: 'Investigation guide',
  }
);

export const Indent = styled.div`
  padding: 0 8px;
  word-break: break-word;
`;

export const BasicAlertDataContext = createContext<Partial<UseBasicDataFromDetailsDataResult>>({});

interface InvestigationGuideViewProps {
  /**
   * An object of basic fields from the event details data
   */
  basicData: UseBasicDataFromDetailsDataResult;
  /**
   * The markdown text of rule.note
   */
  ruleNote: string;
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
  basicData,
  ruleNote,
  showFullView = false,
  showTitle = true,
}) => {
  return (
    <BasicAlertDataContext.Provider value={basicData}>
      {showTitle && (
        <>
          <EuiSpacer size="l" />
          <EuiTitle size="xxxs" data-test-subj="summary-view-guide">
            <h5>{INVESTIGATION_GUIDE}</h5>
          </EuiTitle>
          <EuiSpacer size="s" />
        </>
      )}
      <Indent>
        {showFullView ? (
          <EuiText size="xs" data-test-subj="investigation-guide-full-view">
            <MarkdownRenderer>{ruleNote}</MarkdownRenderer>
          </EuiText>
        ) : (
          <EuiText size="xs" data-test-subj="investigation-guide-clamped">
            <LineClamp lineClampHeight={4.5}>
              <MarkdownRenderer>{ruleNote}</MarkdownRenderer>
            </LineClamp>
          </EuiText>
        )}
      </Indent>
    </BasicAlertDataContext.Provider>
  );
};

export const InvestigationGuideView = React.memo(InvestigationGuideViewComponent);
