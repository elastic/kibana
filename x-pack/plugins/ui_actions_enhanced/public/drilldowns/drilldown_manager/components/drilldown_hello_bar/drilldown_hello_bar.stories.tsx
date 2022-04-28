/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { storiesOf } from '@storybook/react';
import { DrilldownHelloBar } from '.';

const Demo = () => {
  const [show, setShow] = React.useState(true);
  return show ? (
    <DrilldownHelloBar
      docsLink={'https://elastic.co'}
      onHideClick={() => {
        setShow(false);
      }}
    />
  ) : null;
};

storiesOf('components/DrilldownHelloBar', module).add('default', () => <Demo />);
