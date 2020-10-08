/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { Toolbar } from '../toolbar.component';

// @ts-expect-error untyped local
import { getDefaultElement } from '../../../state/defaults';

storiesOf('components/Toolbar', module)
  .add('no element selected', () => (
    <Toolbar
      isWriteable={true}
      selectedPageNumber={1}
      totalPages={1}
      workpadId={'abc'}
      workpadName={'My Canvas Workpad'}
    />
  ))
  .add('element selected', () => (
    <Toolbar
      isWriteable={true}
      selectedElement={getDefaultElement()}
      selectedPageNumber={1}
      totalPages={1}
      workpadId={'abc'}
      workpadName={'My Canvas Workpad'}
    />
  ));
