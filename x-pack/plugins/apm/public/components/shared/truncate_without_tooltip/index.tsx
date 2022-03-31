/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import React from 'react';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { truncate } from '../../../utils/style';

const ContentWrapper = euiStyled.div`
  ${truncate('100%')}
`;

interface Props {
  text: string;
  content?: React.ReactNode;
  'data-test-subj'?: string;
}

export function TruncateWithoutTooltip(props: Props) {
  const { text, content, ...rest } = props;

  return <ContentWrapper>{content || text}</ContentWrapper>;
}
