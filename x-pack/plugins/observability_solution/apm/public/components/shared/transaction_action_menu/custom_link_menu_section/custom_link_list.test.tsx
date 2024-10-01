/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { CustomLink } from '../../../../../common/custom_link/custom_link_types';
import { expectTextsInDocument, expectTextsNotInDocument } from '../../../../utils/test_helpers';
import { CustomLinkList } from './custom_link_list';
import { FlattenedTransaction } from '../../../../../server/routes/settings/custom_link/get_transaction';

describe('CustomLinkList', () => {
  const customLinks = [
    { id: '1', label: 'foo', url: 'http://elastic.co' },
    {
      id: '2',
      label: 'bar',
      url: 'http://elastic.co?service.name={{service.name}}',
    },
  ] as CustomLink[];
  const transactionFields: FlattenedTransaction = {
    'service.name': ['foo, bar'],
  };
  it('shows links', () => {
    const component = render(
      <CustomLinkList customLinks={customLinks} transactionFields={transactionFields} />
    );
    expectTextsInDocument(component, ['foo', 'bar']);
  });

  it('doesnt show any links', () => {
    const component = render(
      <CustomLinkList customLinks={[]} transactionFields={transactionFields} />
    );
    expectTextsNotInDocument(component, ['foo', 'bar']);
  });
});
