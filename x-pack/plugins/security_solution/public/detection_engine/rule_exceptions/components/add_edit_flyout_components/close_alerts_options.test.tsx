/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { ExceptionItemsFlyoutAlertOptions } from './exception_flyout_alerts_option';
import { getMockTheme } from '../../../lib/kibana/kibana_react.mock';

jest.mock('../../../lib/kibana');

const mockTheme = getMockTheme({
  eui: {
    euiBreakpoints: {
      l: '1200px',
    },
    euiSizeM: '10px',
    euiBorderThin: '1px solid #ece',
  },
});

describe('ExceptionItemsFlyoutAlertOptions', () => {
  it('it displays single alert close checkbox if alert status is not "closed" and "alertData" exists', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <ExceptionItemsFlyoutAlertOptions
          exceptionListItems={}
          exceptionListType={}
          shouldCloseSingleAlert={}
          shouldBulkCloseAlert={}
          disableBulkClose={}
          alertData={}
          alertStatus={}
          dispatch={}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionFlyoutCommentAccordion"]').exists()
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="newExceptionItemCommentTextArea"]').at(1).props().value
    ).toEqual('This is a new comment');
  });

  xit('it does not display single alert close checkbox if alert status is "closed"', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <ExceptionItemsFlyoutAlertOptions
          exceptionListItems={}
          exceptionListType={}
          shouldCloseSingleAlert={}
          shouldBulkCloseAlert={}
          disableBulkClose={}
          alertData={}
          alertStatus={}
          dispatch={}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionFlyoutCommentAccordion"]').exists()
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="newExceptionItemCommentTextArea"]').at(1).props().value
    ).toEqual('This is a new comment');
  });

  xit('it does not display single alert close checkbox if "alertData" does not exist', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <ExceptionItemsFlyoutAlertOptions
          exceptionListItems={}
          exceptionListType={}
          shouldCloseSingleAlert={}
          shouldBulkCloseAlert={}
          disableBulkClose={}
          alertData={}
          alertStatus={}
          dispatch={}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionFlyoutCommentAccordion"]').exists()
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="newExceptionItemCommentTextArea"]').at(1).props().value
    ).toEqual('This is a new comment');
  });

  xit('it displays bulk close checkbox', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <ExceptionItemsFlyoutAlertOptions
          exceptionListItems={}
          exceptionListType={}
          shouldCloseSingleAlert={}
          shouldBulkCloseAlert={}
          disableBulkClose={}
          alertData={}
          alertStatus={}
          dispatch={}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionFlyoutCommentAccordion"]').exists()
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="newExceptionItemCommentTextArea"]').at(1).props().value
    ).toEqual('This is a new comment');
  });

  xit('it displays endpoint quarantine text if exception list type is "endpoint"', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <ExceptionItemsFlyoutAlertOptions
          exceptionListItems={}
          exceptionListType={}
          shouldCloseSingleAlert={}
          shouldBulkCloseAlert={}
          disableBulkClose={}
          alertData={}
          alertStatus={}
          dispatch={}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionFlyoutCommentAccordion"]').exists()
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="newExceptionItemCommentTextArea"]').at(1).props().value
    ).toEqual('This is a new comment');
  });
});
