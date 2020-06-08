/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { ExceptionsViewerHeader } from '../viewer/exceptions_viewer_header';

storiesOf('ExceptionsViewerHeader', module)
  .add('loading', () => {
    return (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          isInitLoading={true}
          detectionsListItems={5}
          endpointListItems={2000}
          supportedListTypes={['a', 'b']}
          onFilterChange={() => {}}
          onAddEndpointExceptionClick={() => {}}
          onAddDetectionsExceptionClick={() => {}}
        />
      </ThemeProvider>
    );
  })
  .add('all lists', () => {
    return (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          isInitLoading={false}
          detectionsListItems={5}
          endpointListItems={2000}
          supportedListTypes={['a', 'b']}
          onFilterChange={() => {}}
          onAddEndpointExceptionClick={() => {}}
          onAddDetectionsExceptionClick={() => {}}
        />
      </ThemeProvider>
    );
  })
  .add('endpoint only', () => {
    return (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          isInitLoading={false}
          detectionsListItems={0}
          endpointListItems={2000}
          supportedListTypes={['a']}
          onFilterChange={() => {}}
          onAddEndpointExceptionClick={() => {}}
          onAddDetectionsExceptionClick={() => {}}
        />
      </ThemeProvider>
    );
  })
  .add('detections only', () => {
    return (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          isInitLoading={false}
          detectionsListItems={5}
          endpointListItems={0}
          supportedListTypes={['a']}
          onFilterChange={() => {}}
          onAddEndpointExceptionClick={() => {}}
          onAddDetectionsExceptionClick={() => {}}
        />
      </ThemeProvider>
    );
  });
