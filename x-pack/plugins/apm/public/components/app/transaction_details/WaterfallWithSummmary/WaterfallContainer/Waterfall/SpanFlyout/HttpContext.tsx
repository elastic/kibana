/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { euiStyled } from '../../../../../../../../../../../src/plugins/kibana_react/common';
import {
  borderRadius,
  fontFamilyCode,
  fontSize,
  px,
  unit,
  units,
} from '../../../../../../../style/variables';
import { Span } from '../../../../../../../../typings/es_schemas/ui/span';

const ContextUrl = euiStyled.div`
  padding: ${px(units.half)} ${px(unit)};
  background: ${({ theme }) => theme.eui.euiColorLightestShade};
  border-radius: ${borderRadius};
  border: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  font-family: ${fontFamilyCode};
  font-size: ${fontSize};
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
