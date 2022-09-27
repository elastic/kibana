/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { PageError } from './page_error';
import { errorTitle } from '../../../../translations';
import { InfraHttpError } from '../../../../types';
import { useDocumentTitle } from '../../../../hooks/use_document_title';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('../../../../hooks/use_document_title', () => ({
  useDocumentTitle: jest.fn(),
}));

describe('PageError component', () => {
  const mountError = (name: string, error: InfraHttpError) =>
    mount(
      <I18nProvider>
        <PageError name={name} error={error} />
      </I18nProvider>
    ).find('PageError');

  it('renders correctly and set title', () => {
    const mounted = mountError('test', {
      body: {
        statusCode: 500,
        message: 'Error Message',
      },
      message: 'Error Message',
    } as InfraHttpError);

    const callOut = mounted.find('EuiCallOut');
    expect(callOut.render()).toMatchSnapshot();

    expect(useDocumentTitle).toHaveBeenCalledWith([{ text: `${errorTitle}` }]);
  });
});
