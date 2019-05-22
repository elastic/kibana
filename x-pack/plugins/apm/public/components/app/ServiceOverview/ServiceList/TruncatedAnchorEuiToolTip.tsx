/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactElement } from 'react';
import styled from 'styled-components';
import { EuiToolTip } from '@elastic/eui';
import { truncate } from '../../../../style/variables';

export const StyledAnchorEuiToolTip: React.FC<{
  className: string;
  [prop: string]: any;
  children: ReactElement<any>; // matches EuiToolTip's children prop type
}> = ({ className, ...props }) => (
  <EuiToolTip {...props} anchorClassName={className} />
);

export const TruncatedAnchorEuiToolTip = styled(StyledAnchorEuiToolTip)`
  ${truncate('100%')};
`;
