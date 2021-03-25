/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storiesOf, addDecorator } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { EuiThemeProvider } from '../../../../../../../../../src/plugins/kibana_react/common';
import { ExceptionItem } from './';
import { getExceptionListItemSchemaMock } from '../../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getCommentsArrayMock } from '../../../../../../../lists/common/schemas/types/comment.mock';

addDecorator((storyFn) => <EuiThemeProvider darkMode={false}>{storyFn()}</EuiThemeProvider>);

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
        loadingItemIds={[{ id, namespaceType: namespace_type }]}
        commentsAccordionId={'accordion--comments'}
        exceptionItem={{ id, namespace_type, ...rest }}
        onDeleteException={action('onClick')}
        onEditException={action('onClick')}
      />
    );
  });
