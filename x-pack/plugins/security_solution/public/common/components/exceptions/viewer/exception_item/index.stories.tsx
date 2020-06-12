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

import { ExceptionItem } from './';
import { Operator } from '../../types';
import { getExceptionItemMock } from '../../mocks';

addDecorator((storyFn) => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>{storyFn()}</ThemeProvider>
));

storiesOf('Components|ExceptionItem', module)
  .add('with os', () => {
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
      <ExceptionItem
        loadingItemIds={[]}
        commentsAccordionId={'accordion--comments'}
        exceptionItem={payload}
        onDeleteException={action('onClick')}
        onEditException={action('onClick')}
      />
    );
  })
  .add('with description', () => {
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
      <ExceptionItem
        loadingItemIds={[]}
        commentsAccordionId={'accordion--comments'}
        exceptionItem={payload}
        onDeleteException={action('onClick')}
        onEditException={action('onClick')}
      />
    );
  })
  .add('with comments', () => {
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
      <ExceptionItem
        loadingItemIds={[]}
        commentsAccordionId={'accordion--comments'}
        exceptionItem={payload}
        onDeleteException={action('onClick')}
        onEditException={action('onClick')}
      />
    );
  })
  .add('with nested entries', () => {
    const payload = getExceptionItemMock();
    payload._tags = [];
    payload.description = '';
    payload.comments = [];

    return (
      <ExceptionItem
        loadingItemIds={[]}
        commentsAccordionId={'accordion--comments'}
        exceptionItem={payload}
        onDeleteException={action('onClick')}
        onEditException={action('onClick')}
      />
    );
  })
  .add('with everything', () => {
    const payload = getExceptionItemMock();

    return (
      <ExceptionItem
        loadingItemIds={[]}
        commentsAccordionId={'accordion--comments'}
        exceptionItem={payload}
        onDeleteException={action('onClick')}
        onEditException={action('onClick')}
      />
    );
  })
  .add('with loadingItemIds', () => {
    const { id, namespace_type, ...rest } = getExceptionItemMock();

    return (
      <ExceptionItem
        loadingItemIds={[{ id, namespaceType: namespace_type }]}
        commentsAccordionId={'accordion--comments'}
        exceptionItem={{ id, namespace_type, ...rest }}
        onDeleteException={action('onClick')}
        onEditException={action('onClick')}
      />
    );
  });
