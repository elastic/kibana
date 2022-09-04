/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiFieldText } from '@elastic/eui';

import { ExceptionsFlyoutMeta } from './item_meta_info';
import { getMockTheme } from '../../../lib/kibana/kibana_react.mock';

const mockTheme = getMockTheme({
  eui: {
    euiBreakpoints: {
      l: '1200px',
    },
    euiSizeM: '10px',
    euiBorderThin: '1px solid #ece',
  },
});

describe('ExceptionsFlyoutMeta', () => {
  it('it renders component', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <ExceptionsFlyoutMeta exceptionItemName={'Test name'} dispatch={jest.fn()} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionFlyoutName"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="exceptionFlyoutNameInput"]').at(1).props().value).toEqual(
      'Test name'
    );
  });

  it('it calls dispatch on name change', () => {
    const mockDispatch = jest.fn();
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <ExceptionsFlyoutMeta exceptionItemName={''} dispatch={mockDispatch} />
      </ThemeProvider>
    );

    (
      wrapper.find(EuiFieldText).at(0).props() as unknown as {
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
      }
    ).onChange({ target: { value: 'Name change' } } as React.ChangeEvent<HTMLInputElement>);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'setExceptionItemMeta',
      value: ['name', 'Name change'],
    });
  });
});
