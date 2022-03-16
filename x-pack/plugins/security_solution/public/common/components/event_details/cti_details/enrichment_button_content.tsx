/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';
import { EuiToolTip } from '@elastic/eui';
import * as i18n from './translations';

const OverflowParent = styled.div`
  display: inline-grid;
`;

const OverflowContainer = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: bold;
`;

export const EnrichmentButtonContent: React.FC<{
  field?: string;
  feedName?: string;
  value?: string;
}> = ({ field = '', feedName = '', value = '' }) => {
  const title = `${field} ${value}${feedName ? ` ${i18n.FEED_NAME_PREPOSITION} ${feedName}` : ''}`;
  return (
    <EuiToolTip content={value}>
      <OverflowParent data-test-subj={'enrichment-button-content'}>
        <OverflowContainer>{title}</OverflowContainer>
      </OverflowParent>
    </EuiToolTip>
  );
};
