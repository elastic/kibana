/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { PageError } from './page_error';
import { errorTitle } from '../../../../translations';
import { InfraHttpError } from '../../../../types';
import { useDocumentTitle } from '../../../../hooks/use_document_title';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('../../../../hooks/use_document_title', () => ({
  useDocumentTitle: jest.fn(),
}));

const renderErrorPage = () =>
  render(
    <I18nProvider>
      <PageError
        name={'test'}
        error={
          {
            body: {
              statusCode: 500,
              message: 'Error Message',
            },
            message: 'Error Message',
          } as InfraHttpError
        }
      />
    </I18nProvider>
  );

describe('PageError component', () => {
  it('renders correctly and set title', () => {
    const { getByText } = renderErrorPage();
    expect(useDocumentTitle).toHaveBeenCalledWith([{ text: `${errorTitle}` }]);

    expect(getByText('Error Message')).toBeInTheDocument();
    expect(getByText('Please click the back button and try again.')).toBeInTheDocument();
  });
});
