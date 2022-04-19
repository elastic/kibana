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

import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { getCommentsArrayMock } from '@kbn/lists-plugin/common/schemas/types/comment.mock';
import { ExceptionItem } from '.';

addDecorator((storyFn) => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>{storyFn()}</ThemeProvider>
));

storiesOf('Components/ExceptionItem', module)
  .add('with os', () => {
    const payload = getExceptionListItemSchemaMock();
    payload.description = '';
    payload.comments = [];
    payload.entries = [
      {
        field: 'actingProcess.file.signer',
        type: 'match',
        operator: 'included',
        value: 'Elastic, N.V.',
      },
    ];

    return (
      <ExceptionItem
        disableActions={false}
        loadingItemIds={[]}
        commentsAccordionId={'accordion--comments'}
        exceptionItem={payload}
        onDeleteException={action('onClick')}
        onEditException={action('onClick')}
      />
    );
  })
  .add('with description', () => {
    const payload = getExceptionListItemSchemaMock();
    payload.comments = [];
    payload.entries = [
      {
        field: 'actingProcess.file.signer',
        type: 'match',
        operator: 'included',
        value: 'Elastic, N.V.',
      },
    ];

    return (
      <ExceptionItem
        disableActions={false}
        loadingItemIds={[]}
        commentsAccordionId={'accordion--comments'}
        exceptionItem={payload}
        onDeleteException={action('onClick')}
        onEditException={action('onClick')}
      />
    );
  })
  .add('with comments', () => {
    const payload = getExceptionListItemSchemaMock();
    payload.description = '';
    payload.comments = getCommentsArrayMock();
    payload.entries = [
      {
        field: 'actingProcess.file.signer',
        type: 'match',
        operator: 'included',
        value: 'Elastic, N.V.',
      },
    ];

    return (
      <ExceptionItem
        disableActions={false}
        loadingItemIds={[]}
        commentsAccordionId={'accordion--comments'}
        exceptionItem={payload}
        onDeleteException={action('onClick')}
        onEditException={action('onClick')}
      />
    );
  })
  .add('with nested entries', () => {
    const payload = getExceptionListItemSchemaMock();
    payload.description = '';
    payload.comments = [];

    return (
      <ExceptionItem
        disableActions={false}
        loadingItemIds={[]}
        commentsAccordionId={'accordion--comments'}
        exceptionItem={payload}
        onDeleteException={action('onClick')}
        onEditException={action('onClick')}
      />
    );
  })
  .add('with everything', () => {
    const payload = getExceptionListItemSchemaMock();
    payload.comments = getCommentsArrayMock();
    return (
      <ExceptionItem
        disableActions={false}
        loadingItemIds={[]}
        commentsAccordionId={'accordion--comments'}
        exceptionItem={payload}
        onDeleteException={action('onClick')}
        onEditException={action('onClick')}
      />
    );
  })
  .add('with loadingItemIds', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { id, namespace_type, ...rest } = getExceptionListItemSchemaMock();

    return (
      <ExceptionItem
        disableActions={false}
        loadingItemIds={[{ id, namespaceType: namespace_type }]}
        commentsAccordionId={'accordion--comments'}
        exceptionItem={{ id, namespace_type, ...rest }}
        onDeleteException={action('onClick')}
        onEditException={action('onClick')}
      />
    );
  })
  .add('with actions disabled', () => {
    const payload = getExceptionListItemSchemaMock();
    payload.description = '';
    payload.comments = getCommentsArrayMock();
    payload.entries = [
      {
        field: 'actingProcess.file.signer',
        type: 'match',
        operator: 'included',
        value: 'Elastic, N.V.',
      },
    ];

    return (
      <ExceptionItem
        disableActions
        loadingItemIds={[]}
        commentsAccordionId={'accordion--comments'}
        exceptionItem={payload}
        onDeleteException={action('onClick')}
        onEditException={action('onClick')}
      />
    );
  });
