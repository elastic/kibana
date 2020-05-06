/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiText } from '@elastic/eui';
import { ComponentStrings } from '../../../i18n/components';

const { MultiElementSettings: strings } = ComponentStrings;

export const MultiElementSettings: FunctionComponent = () => (
  <div className="canvasSidebar__panel canvasSidebar__panel--isEmpty">
    <EuiText size="s">
      <p>{strings.getMultipleElementsDescription()}</p>
      <p>{strings.getMultipleElementsActionsDescription()}</p>
    </EuiText>
  </div>
);
