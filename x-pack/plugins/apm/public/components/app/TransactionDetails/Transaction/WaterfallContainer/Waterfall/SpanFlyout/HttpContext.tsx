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

import { EuiTitle } from '@elastic/eui';
import { HttpContext } from '../../../../../../../../typings/Span';

const DatabaseStatement = styled.div`
  margin-top: ${px(unit)};
  padding: ${px(units.half)} ${px(unit)};
  background: ${colors.gray5};
  border-radius: ${borderRadius};
  border: 1px solid ${colors.gray4};
  font-family: ${fontFamilyCode};
`;

interface Props {
  httpContext?: HttpContext;
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
      <DatabaseStatement>{httpContext.url}</DatabaseStatement>
    </Fragment>
  );
}
