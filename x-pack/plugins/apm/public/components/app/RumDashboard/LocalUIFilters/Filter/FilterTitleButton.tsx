/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiButtonEmptyProps, EuiTitle } from '@elastic/eui';
import React, { FunctionComponent } from 'react';
import { StyledComponent } from 'styled-components';
import {
  euiStyled,
  EuiTheme,
} from '../../../../../../../../../src/plugins/kibana_react/common';

// The return type of this component needs to be specified because the inferred
// return type depends on types that are not exported from EUI. You get a TS4023
// error if the return type is not specified.
const Button: StyledComponent<
  FunctionComponent<EuiButtonEmptyProps>,
  EuiTheme
> = euiStyled(EuiButtonEmpty).attrs(() => ({
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
