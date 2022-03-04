/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import React from 'react';

import * as i18n from '../../translations';

interface Props {
  maxItems: number;
}

const LimitMessageComponent = ({ maxItems }: Props) => (
  <EuiText data-test-subj="limitMessage" color="subdued" size="xs">
    {i18n.SUBTITLE(maxItems)}
  </EuiText>
);

LimitMessageComponent.displayName = 'LimitMessageComponent';

export const LimitMessage = React.memo(LimitMessageComponent);
