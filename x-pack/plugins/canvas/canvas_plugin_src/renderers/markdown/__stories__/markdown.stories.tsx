/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { markdownFactory } from '../';
import { Render } from '../../__stories__/render';
import { StartDeps } from '../../../plugin';
import { coreStartMock } from '../../../../__fixtures__/core_dependencies';

const markdown = markdownFactory(coreStartMock, {} as StartDeps);
storiesOf('renderers/markdown', module)
  .add('default', () => {
    const config = {
      content: '# This is Markdown',
      font: {
        css: '',
        spec: {},
        type: 'style' as 'style',
      },
      openLinksInNewTab: false,
    };
    return <Render renderer={markdown} config={config} />;
  })
  .add('links in new tab', () => {
    const config = {
      content: '[Elastic.co](https://elastic.co)',
      font: {
        css: '',
        spec: {},
        type: 'style' as 'style',
      },
      openLinksInNewTab: true,
    };
    return <Render renderer={markdown} config={config} />;
  });
