/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { storiesOf } from '@storybook/react';
import { DrilldownHelloBar } from './index';

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
