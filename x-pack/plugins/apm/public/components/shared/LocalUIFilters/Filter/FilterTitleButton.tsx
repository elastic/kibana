/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButtonEmpty, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';

const Button = styled(EuiButtonEmpty).attrs(() => ({
  contentProps: {
    className: 'alignLeft'
  },
  color: 'text'
}))`
  width: 100%;

  .alignLeft {
    justify-content: flex-start;
    padding-left: 0;
  }
`;

type Props = React.ComponentProps<typeof Button>;

export const FilterTitleButton = (props: Props) => {
  return (
    <Button {...props}>
      <EuiTitle size="xxxs" textTransform="uppercase">
        <h4>{props.children}</h4>
      </EuiTitle>
    </Button>
  );
};
