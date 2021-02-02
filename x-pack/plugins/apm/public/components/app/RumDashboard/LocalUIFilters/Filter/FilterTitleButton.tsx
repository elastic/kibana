/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiTitle } from '@elastic/eui';
import { euiStyled } from 'src/plugins/kibana_react/common';

const Button = euiStyled(EuiButtonEmpty).attrs(() => ({
  contentProps: {
    className: 'alignLeft',
  },
  color: 'text',
}))`
  width: 100%;

  .alignLeft {
    justify-content: flex-start;
    padding-left: 0;
  }
`;

type Props = React.ComponentProps<typeof Button>;

export function FilterTitleButton(props: Props) {
  return (
    <Button {...props}>
      <EuiTitle size="xxxs" textTransform="uppercase">
        <h4>{props.children}</h4>
      </EuiTitle>
    </Button>
  );
}
