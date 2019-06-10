/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiIcon } from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ColorDot } from '../color_dot';

storiesOf('components/ColorDot', module)
  .addParameters({ info: { propTablesExclude: [EuiIcon] } })
  .add('color dots', () => [
    <ColorDot key="1" value="white" />,
    <ColorDot key="2" value="rgb(100, 150, 250)" />,
    <ColorDot key="3" value="rgba(100, 150, 250, .5)" />,
    <ColorDot key="4" value="#000" />,
  ])
  .add('invalid dots', () => [
    <ColorDot key="1" value="elastic" />,
    <ColorDot key="2" value="#canvas" />,
    <ColorDot key="3" value="#abcd" />,
  ])
  .add('color dots with children', () => [
    <ColorDot key="1" value="#FFF">
      <EuiIcon type="plusInCircle" color="#000" />
    </ColorDot>,
    <ColorDot key="2" value="#666">
      <EuiIcon type="minusInCircle" color="#fff" />
    </ColorDot>,
    <ColorDot key="3" value="rgba(100, 150, 250, .5)">
      <EuiIcon type="alert" color="#fff" />
    </ColorDot>,
    <ColorDot key="4" value="#000">
      <EuiIcon type="check" color="#fff" />
    </ColorDot>,
  ]);
