/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf, addDecorator } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { ExceptionsViewerHeader } from './exceptions_viewer_header';
import { ExceptionListTypeEnum } from '../../../../../public/lists_plugin_deps';

addDecorator((storyFn) => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>{storyFn()}</ThemeProvider>
));

storiesOf('Components|ExceptionsViewerHeader', module)
  .add('loading', () => {
    return (
      <ExceptionsViewerHeader
        isInitLoading={true}
        detectionsListItems={5}
        endpointListItems={2000}
        supportedListTypes={[ExceptionListTypeEnum.DETECTION, ExceptionListTypeEnum.ENDPOINT]}
        onFilterChange={action('onClick')}
        onAddExceptionClick={action('onClick')}
      />
    );
  })
  .add('all lists', () => {
    return (
      <ExceptionsViewerHeader
        isInitLoading={false}
        detectionsListItems={5}
        endpointListItems={2000}
        supportedListTypes={[ExceptionListTypeEnum.DETECTION, ExceptionListTypeEnum.ENDPOINT]}
        onFilterChange={action('onClick')}
        onAddExceptionClick={action('onClick')}
      />
    );
  })
  .add('endpoint only', () => {
    return (
      <ExceptionsViewerHeader
        isInitLoading={false}
        detectionsListItems={0}
        endpointListItems={2000}
        supportedListTypes={[ExceptionListTypeEnum.DETECTION]}
        onFilterChange={action('onClick')}
        onAddExceptionClick={action('onClick')}
      />
    );
  })
  .add('detections only', () => {
    return (
      <ExceptionsViewerHeader
        isInitLoading={false}
        detectionsListItems={5}
        endpointListItems={0}
        supportedListTypes={[ExceptionListTypeEnum.DETECTION]}
        onFilterChange={action('onClick')}
        onAddExceptionClick={action('onClick')}
      />
    );
  });
