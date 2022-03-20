/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storiesOf, addDecorator } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { euiLightVars } from '@kbn/ui-theme';

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionsViewerHeader } from './exceptions_viewer_header';

addDecorator((storyFn) => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>{storyFn()}</ThemeProvider>
));

storiesOf('Components/ExceptionsViewerHeader', module)
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
