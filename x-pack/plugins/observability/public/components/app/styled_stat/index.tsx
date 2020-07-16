/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import styled from 'styled-components';
import { EuiStat } from '@elastic/eui';
import React from 'react';
import { EuiStatProps } from '@elastic/eui/src/components/stat/stat';

const Stat = styled(EuiStat)`
  .euiStat__title {
    color: ${(props) => props.color};
  }
`;

interface Props extends Partial<EuiStatProps> {
  children?: React.ReactNode;
  color?: string;
}

const EMPTY_VALUE = '--';

export const StyledStat = (props: Props) => {
  const { description = EMPTY_VALUE, title = EMPTY_VALUE, ...rest } = props;
  return <Stat description={description} title={title} titleSize="s" {...rest} />;
};
