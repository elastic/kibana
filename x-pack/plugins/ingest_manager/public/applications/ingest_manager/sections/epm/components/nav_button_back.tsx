/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

export function NavButtonBack({ href, text }: { href: string; text: string }) {
  const ButtonEmpty = styled(EuiButtonEmpty)`
    margin-right: ${(props) => props.theme.eui.spacerSizes.xl};
  `;
  return (
    <ButtonEmpty iconType="arrowLeft" size="xs" flush="left" href={href}>
      {text}
    </ButtonEmpty>
  );
}
