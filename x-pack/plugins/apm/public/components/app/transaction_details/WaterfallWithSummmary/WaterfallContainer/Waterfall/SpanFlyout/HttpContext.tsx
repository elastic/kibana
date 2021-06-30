/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { euiStyled } from '../../../../../../../../../../../src/plugins/kibana_react/common';
import { Span } from '../../../../../../../../typings/es_schemas/ui/span';

const ContextUrl = euiStyled.div`
padding: ${({ theme }) =>
  `${theme.eui.paddingSizes.s} ${theme.eui.paddingSizes.m}`};
  background: ${({ theme }) => theme.eui.euiColorLightestShade};
  border-radius: ${({ theme }) => theme.eui.euiBorderRadiusSmall};
  border: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
`;

interface Props {
  httpContext: NonNullable<Span['span']>['http'];
}

export function HttpContext({ httpContext }: Props) {
  const url = httpContext?.url?.original;

  if (!url) {
    return null;
  }

  return (
    <Fragment>
      <EuiTitle size="xs">
        <h3>HTTP URL</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <ContextUrl>{url}</ContextUrl>
      <EuiSpacer size="l" />
    </Fragment>
  );
}
