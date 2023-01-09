/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import * as i18n from '../translations';
import type { IlmPhase } from '../../../../types';

const LabelContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.eui.euiSizeXS};
`;

interface Props {
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  pattern: string;
}

const IndexLabelComponent: React.FC<Props> = ({ indexName, ilmPhase, pattern }) => (
  <LabelContainer>
    <EuiToolTip content={i18n.INDEX_TOOL_TIP(pattern)}>
      <>
        <span aria-roledescription={i18n.INDEX_NAME_LABEL}>{indexName}</span>{' '}
        {ilmPhase != null && <EuiBadge color="hollow">{ilmPhase}</EuiBadge>}
      </>
    </EuiToolTip>
  </LabelContainer>
);

IndexLabelComponent.displayName = 'IndexLabelComponent';

export const IndexLabel = React.memo(IndexLabelComponent);
