/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { ThemeProvider } from 'styled-components';

import * as i18n from './translations';
import { ExceptionItemCardHeader } from './header';
import { getMockTheme } from '../../../../common/lib/kibana/kibana_react.mock';

const mockTheme = getMockTheme({
  eui: {
    euiSize: '10px',
    euiColorPrimary: '#ece',
    euiColorDanger: '#ece',
  },
});

describe('ExceptionItemCardHeader', () => {
  it('it renders item name', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ExceptionItemCardHeader
          item={getExceptionListItemSchemaMock()}
          dataTestSubj="exceptionItemHeader"
          actions={[
            {
              key: 'edit',
              icon: 'pencil',
              label: i18n.EXCEPTION_ITEM_EDIT_BUTTON,
              onClick: jest.fn(),
            },
            {
              key: 'delete',
              icon: 'trash',
              label: i18n.EXCEPTION_ITEM_DELETE_BUTTON,
              onClick: jest.fn(),
            },
          ]}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionItemHeader-title"]').at(0).text()).toEqual(
      'some name'
    );
  });

  it('it displays actions', () => {
    const handleEdit = jest.fn();
    const handleDelete = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ExceptionItemCardHeader
          actions={[
            {
              key: 'edit',
              icon: 'pencil',
              label: i18n.EXCEPTION_ITEM_EDIT_BUTTON,
              onClick: handleEdit,
            },
            {
              key: 'delete',
              icon: 'trash',
              label: i18n.EXCEPTION_ITEM_DELETE_BUTTON,
              onClick: handleDelete,
            },
          ]}
          item={getExceptionListItemSchemaMock()}
          dataTestSubj="exceptionItemHeader"
        />
      </ThemeProvider>
    );

    // click on popover
    wrapper
      .find('button[data-test-subj="exceptionItemHeader-actionButton"]')
      .at(0)
      .simulate('click');

    wrapper.find('button[data-test-subj="exceptionItemHeader-actionItem-edit"]').simulate('click');
    expect(handleEdit).toHaveBeenCalled();

    wrapper
      .find('button[data-test-subj="exceptionItemHeader-actionItem-delete"]')
      .simulate('click');
    expect(handleDelete).toHaveBeenCalled();
  });

  it('it disables actions if disableActions is true', () => {
    const handleEdit = jest.fn();
    const handleDelete = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ExceptionItemCardHeader
          actions={[
            {
              key: 'edit',
              icon: 'pencil',
              label: i18n.EXCEPTION_ITEM_EDIT_BUTTON,
              onClick: handleEdit,
            },
            {
              key: 'delete',
              icon: 'trash',
              label: i18n.EXCEPTION_ITEM_DELETE_BUTTON,
              onClick: handleDelete,
            },
          ]}
          item={getExceptionListItemSchemaMock()}
          disableActions
          dataTestSubj="exceptionItemHeader"
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('button[data-test-subj="exceptionItemHeader-actionButton"]').at(0).props()
        .disabled
    ).toBeTruthy();
  });
});
