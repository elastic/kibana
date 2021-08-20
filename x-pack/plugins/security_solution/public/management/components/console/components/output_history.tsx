/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren } from 'react';
import styled from 'styled-components';
import { CommonProps } from '@elastic/eui';

const OutputHistoryContainer = styled.div`
  height: 100%;
`;

export type OutputHistoryProps = CommonProps & PropsWithChildren<{}>;

export const OutputHistory = memo<OutputHistoryProps>(({ children, ...otherProps }) => {
  return <OutputHistoryContainer {...otherProps}>{children}</OutputHistoryContainer>;
});

OutputHistory.displayName = 'OutputHistory';
