/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { americanTypewriter } from '../../../../common/lib/fonts';
import { FontPicker } from '../font_picker';

storiesOf('components/FontPicker', module)
  .add('default', () => <FontPicker onSelect={action('onSelect')} />)
  .add('with value', () => (
    <FontPicker onSelect={action('onSelect')} value={americanTypewriter.value} />
  ));
