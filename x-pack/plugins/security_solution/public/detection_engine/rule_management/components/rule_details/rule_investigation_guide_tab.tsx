/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiSpacer } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { MarkdownRenderer } from '../../../../common/components/markdown_editor';
import type { InvestigationGuide } from '../../../../../common/api/detection_engine/model/rule_schema/common_attributes';

interface RuleInvestigationGuideTabProps {
  note: InvestigationGuide;
}

export const RuleInvestigationGuideTab = ({ note }: RuleInvestigationGuideTabProps) => {
  return (
    <div
      css={css`
        padding: 0 ${euiThemeVars.euiSizeM};
      `}
    >
      <EuiSpacer size="m" />
      <MarkdownRenderer>{note}</MarkdownRenderer>
    </div>
  );
};
