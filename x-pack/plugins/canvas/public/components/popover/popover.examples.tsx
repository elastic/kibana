/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React, { MouseEvent } from 'react';
import { Popover } from '../popover';

const button = (handleClick: (event: MouseEvent<HTMLButtonElement>) => void) => (
  <button onClick={handleClick}>Click me!</button>
);
const content = <div>Popover content</div>;

storiesOf('components/Popover', module).add('default', () => (
  <Popover id="test-popover1" button={button} closePopover={action('closePopover')}>
    {() => content}
  </Popover>
));
