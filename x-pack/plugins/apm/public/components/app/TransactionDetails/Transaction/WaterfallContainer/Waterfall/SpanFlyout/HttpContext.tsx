/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import styled from 'styled-components';
import {
  borderRadius,
  colors,
  fontFamilyCode,
  px,
  unit,
  units
} from '../../../../../../../style/variables';

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { Span } from 'x-pack/plugins/apm/typings/es_schemas/Span';

const ContextUrl = styled.div`
  padding: ${px(units.half)} ${px(unit)};
  background: ${colors.gray5};
  border-radius: ${borderRadius};
  border: 1px solid ${colors.gray4};
  font-family: ${fontFamilyCode};
`;

interface Props {
  httpContext: Span['context']['http'];
}

export function HttpContext({ httpContext }: Props) {
  if (!httpContext || !httpContext.url) {
    return null;
  }

  return (
    <Fragment>
      <EuiTitle size="xs">
        <h3>HTTP URL</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <ContextUrl>{httpContext.url}</ContextUrl>
      <EuiSpacer size="l" />
    </Fragment>
  );
}
