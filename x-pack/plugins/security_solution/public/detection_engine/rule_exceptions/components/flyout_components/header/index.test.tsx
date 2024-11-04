/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { TestProviders } from '../../../../../common/mock';
import { ExceptionFlyoutHeader } from '.';
import * as i18n from './translations';

describe('Exception flyout header', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('"isEdit" is "false"', () => {
    it('should render proper text when endpoint exception', () => {
      render(
        <TestProviders>
          <ExceptionFlyoutHeader
            listType={ExceptionListTypeEnum.ENDPOINT}
            titleId={'someId'}
            dataTestSubjId={'addExceptionConfirmButton'}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('addExceptionConfirmButton')).toHaveTextContent(
        i18n.ADD_ENDPOINT_EXCEPTION
      );
    });

    it('should render proper text when list type of "rule_default"', () => {
      render(
        <TestProviders>
          <ExceptionFlyoutHeader
            listType={ExceptionListTypeEnum.RULE_DEFAULT}
            titleId={'someId'}
            dataTestSubjId={'addExceptionConfirmButton'}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('addExceptionConfirmButton')).toHaveTextContent(
        i18n.CREATE_RULE_EXCEPTION
      );
    });

    it('should render proper text when list type of "detection"', () => {
      render(
        <TestProviders>
          <ExceptionFlyoutHeader
            listType={ExceptionListTypeEnum.DETECTION}
            titleId={'someId'}
            dataTestSubjId={'addExceptionConfirmButton'}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('addExceptionConfirmButton')).toHaveTextContent(
        i18n.CREATE_RULE_EXCEPTION
      );
    });
  });

  describe('"isEdit" is "true"', () => {
    it('should render proper text when endpoint exception', () => {
      render(
        <TestProviders>
          <ExceptionFlyoutHeader
            isEdit
            listType={ExceptionListTypeEnum.ENDPOINT}
            titleId={'someId'}
            dataTestSubjId={'addExceptionConfirmButton'}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('addExceptionConfirmButton')).toHaveTextContent(
        i18n.EDIT_ENDPOINT_EXCEPTION_TITLE
      );
    });

    it('should render proper text when list type of "rule_default"', () => {
      render(
        <TestProviders>
          <ExceptionFlyoutHeader
            isEdit
            listType={ExceptionListTypeEnum.RULE_DEFAULT}
            titleId={'someId'}
            dataTestSubjId={'addExceptionConfirmButton'}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('addExceptionConfirmButton')).toHaveTextContent(
        i18n.EDIT_EXCEPTION_TITLE
      );
    });

    it('should render proper text when list type of "detection"', () => {
      render(
        <TestProviders>
          <ExceptionFlyoutHeader
            isEdit
            listType={ExceptionListTypeEnum.DETECTION}
            titleId={'someId'}
            dataTestSubjId={'addExceptionConfirmButton'}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('addExceptionConfirmButton')).toHaveTextContent(
        i18n.EDIT_EXCEPTION_TITLE
      );
    });
  });
});
