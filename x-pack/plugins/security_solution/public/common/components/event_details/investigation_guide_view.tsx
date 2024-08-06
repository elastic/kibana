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
import * as i18n from './translations';
import { MarkdownRenderer } from '../markdown_editor';
import { LineClamp } from '../line_clamp';

export const Indent = styled.div`
  padding: 0 8px;
  word-break: break-word;
`;

export const BasicAlertDataContext = createContext<Partial<GetBasicDataFromDetailsData>>({});

interface InvestigationGuideViewProps {
  /**
   * An object of basic fields from the event details data
   */
  basicData: GetBasicDataFromDetailsData;
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
// TODO: MOVE TO FLYOUT FOLDER - https://github.com/elastic/security-team/issues/7462
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
            <h5>{i18n.INVESTIGATION_GUIDE}</h5>
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
