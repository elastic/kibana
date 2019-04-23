/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import styled from 'styled-components';

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { idx } from '@kbn/elastic-idx';
import {
  borderRadius,
  fontFamilyCode,
  fontSize,
  px,
  unit,
  units
} from '../../../../../../../style/variables';
import { Span } from '../../../../../../../../typings/es_schemas/ui/Span';

const ContextUrl = styled.div`
  padding: ${px(units.half)} ${px(unit)};
  background: ${theme.euiColorLightestShade};
  border-radius: ${borderRadius};
  border: 1px solid ${theme.euiColorLightShade};
  font-family: ${fontFamilyCode};
  font-size: ${fontSize};
`;

interface Props {
  httpContext: NonNullable<Span['span']>['http'];
}

export function HttpContext({ httpContext }: Props) {
  const url = idx(httpContext, _ => _.url.original);

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
