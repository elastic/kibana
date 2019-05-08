/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

const LinkIcon = styled(EuiIcon)`
  position: relative;
  top: -2px;
`;

const LinkIconWithMargin = styled(LinkIcon)`
  margin-left: 5px;
`;

const color = 'subdued';
const iconSize = 's';
const iconType = 'popout';

/**
 * Renders an icon that indicates following the hyperlink will navigate to
 * content external to the app
 */
export const ExternalLinkIcon = pure<{
  leftMargin?: boolean;
}>(({ leftMargin = true }) =>
  leftMargin ? (
    <LinkIconWithMargin
      color={color}
      data-test-subj="external-link-icon"
      size={iconSize}
      type={iconType}
    />
  ) : (
    <LinkIcon color={color} data-test-subj="external-link-icon" size={iconSize} type={iconType} />
  )
);
