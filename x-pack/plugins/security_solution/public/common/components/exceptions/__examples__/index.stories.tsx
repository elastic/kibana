/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { ExceptionItem } from '../viewer';
import { Operator } from '../types';
import { getExceptionItemMock } from '../mocks';

storiesOf('components/exceptions', module)
  .add('ExceptionItem/with os', () => {
    const payload = getExceptionItemMock();
    payload.description = '';
    payload.comments = [];
    payload.entries = [
      {
        field: 'actingProcess.file.signer',
        type: 'match',
        operator: Operator.INCLUSION,
        value: 'Elastic, N.V.',
      },
    ];

    return (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionItem
          commentsAccordionId={'accordion--comments'}
          exceptionItem={payload}
          handleDelete={() => {}}
          handleEdit={() => {}}
        />
      </ThemeProvider>
    );
  })
  .add('ExceptionItem/with description', () => {
    const payload = getExceptionItemMock();
    payload._tags = [];
    payload.comments = [];
    payload.entries = [
      {
        field: 'actingProcess.file.signer',
        type: 'match',
        operator: Operator.INCLUSION,
        value: 'Elastic, N.V.',
      },
    ];

    return (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionItem
          commentsAccordionId={'accordion--comments'}
          exceptionItem={payload}
          handleDelete={() => {}}
          handleEdit={() => {}}
        />
      </ThemeProvider>
    );
  })
  .add('ExceptionItem/with comments', () => {
    const payload = getExceptionItemMock();
    payload._tags = [];
    payload.description = '';
    payload.entries = [
      {
        field: 'actingProcess.file.signer',
        type: 'match',
        operator: Operator.INCLUSION,
        value: 'Elastic, N.V.',
      },
    ];

    return (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionItem
          commentsAccordionId={'accordion--comments'}
          exceptionItem={payload}
          handleDelete={() => {}}
          handleEdit={() => {}}
        />
      </ThemeProvider>
    );
  })
  .add('ExceptionItem/with nested entries', () => {
    const payload = getExceptionItemMock();
    payload._tags = [];
    payload.description = '';
    payload.comments = [];

    return (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionItem
          commentsAccordionId={'accordion--comments'}
          exceptionItem={payload}
          handleDelete={() => {}}
          handleEdit={() => {}}
        />
      </ThemeProvider>
    );
  })
  .add('ExceptionItem/with everything', () => {
    const payload = getExceptionItemMock();

    return (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionItem
          commentsAccordionId={'accordion--comments'}
          exceptionItem={payload}
          handleDelete={() => {}}
          handleEdit={() => {}}
        />
      </ThemeProvider>
    );
  });
