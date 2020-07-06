/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiPanel, IconType } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

export function IconPanel({ iconType }: { iconType: IconType }) {
  const Panel = styled(EuiPanel)`
    /* 🤢🤷 https://www.styled-components.com/docs/faqs#how-can-i-override-styles-with-higher-specificity */
    &&& {
      position: absolute;
      text-align: center;
      vertical-align: middle;
      padding: ${(props) => props.theme.eui.spacerSizes.xl};
      svg,
      img {
        height: ${(props) => props.theme.eui.euiKeyPadMenuSize};
        width: ${(props) => props.theme.eui.euiKeyPadMenuSize};
      }
    }
  `;

  return (
    <Panel>
      <EuiIcon type={iconType} size="original" />
    </Panel>
  );
}
