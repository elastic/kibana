/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

export type PinRotation = 'rotate(0)' | 'rotate(45)';

export const getPinRotation = (pinned: boolean): PinRotation =>
  pinned ? 'rotate(0)' : 'rotate(45)';

const PinIcon = styled(EuiIcon)<{ transform: string }>`
  overflow: hidden;
  transform: ${({ transform }) => transform};
`;

interface Props {
  allowUnpinning: boolean;
  pinned: boolean;
  onClick?: () => void;
}

export const Pin = pure<Props>(({ allowUnpinning, pinned, onClick = noop }) => (
  <PinIcon
    cursor={allowUnpinning ? 'pointer' : 'not-allowed'}
    color={pinned ? 'primary' : 'subdued'}
    data-test-subj="pin"
    onClick={onClick}
    role="button"
    size="l"
    transform={getPinRotation(pinned)}
    type="pin"
  />
));
