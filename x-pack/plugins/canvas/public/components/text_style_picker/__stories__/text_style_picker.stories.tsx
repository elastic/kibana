/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { TextStylePicker, StyleProps } from '../text_style_picker';

const Interactive = () => {
  const [style, setStyle] = useState<StyleProps>({});
  const onChange = (styleChange: StyleProps) => {
    setStyle(styleChange);
    action('onChange')(styleChange);
  };
  return <TextStylePicker onChange={onChange} {...style} />;
};

storiesOf('components/TextStylePicker', module)
  .addDecorator((fn) => <div style={{ width: 264 }}>{fn()}</div>)
  .add('default', () => <TextStylePicker onChange={action('onChange')} />)
  .add('interactive', () => <Interactive />);
