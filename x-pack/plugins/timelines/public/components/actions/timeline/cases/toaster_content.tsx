/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiButtonEmpty, EuiText } from '@elastic/eui';
import styled from 'styled-components';

import * as i18n from './translations';

const EuiTextStyled = styled(EuiText)`
  ${({ theme }) => `
    margin-bottom: ${theme.eui?.paddingSizes?.s ?? 8}px;
  `}
`;

interface Props {
  caseId: string;
  syncAlerts: boolean;
  onViewCaseClick: (id: string) => void;
}

const ToasterContentComponent: React.FC<Props> = ({ caseId, syncAlerts, onViewCaseClick }) => {
  const onClick = useCallback(() => onViewCaseClick(caseId), [caseId, onViewCaseClick]);
  return (
    <>
      {syncAlerts && (
        <EuiTextStyled size="s" data-test-subj="toaster-content-sync-text">
          {i18n.CASE_CREATED_SUCCESS_TOAST_TEXT}
        </EuiTextStyled>
      )}
      <EuiButtonEmpty
        size="xs"
        flush="left"
        onClick={onClick}
        data-test-subj="toaster-content-case-view-link"
      >
        {i18n.VIEW_CASE}
      </EuiButtonEmpty>
    </>
  );
};

export const ToasterContent = memo(ToasterContentComponent);
