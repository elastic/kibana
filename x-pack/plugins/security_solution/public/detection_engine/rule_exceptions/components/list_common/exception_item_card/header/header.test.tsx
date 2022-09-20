/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { ThemeProvider } from 'styled-components';

import * as i18n from '../translations';
import { ExceptionItemCardHeader } from './header';
import { getMockTheme } from '../../../../../../common/lib/kibana/kibana_react.mock';
import { fireEvent, render } from '@testing-library/react';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

const mockTheme = getMockTheme({
  eui: {
    euiSize: '10px',
    euiColorPrimary: '#ece',
    euiColorDanger: '#ece',
  },
});
const handleEdit = jest.fn();
const handleDelete = jest.fn();
const actions = [
  {
    key: 'edit',
    icon: 'pencil',
    label: i18n.exceptionItemCardEditButton(ExceptionListTypeEnum.DETECTION),
    onClick: handleEdit,
  },
  {
    key: 'delete',
    icon: 'trash',
    label: i18n.exceptionItemCardDeleteButton(ExceptionListTypeEnum.DETECTION),
    onClick: handleDelete,
  },
];
describe('ExceptionItemCardHeader', () => {
  it('it renders item name', () => {
    const wrapper = render(
      <ThemeProvider theme={mockTheme}>
        <ExceptionItemCardHeader
          item={getExceptionListItemSchemaMock()}
          dataTestSubj="exceptionItemHeader"
          actions={actions}
        />
      </ThemeProvider>
    );

    expect(wrapper.getByTestId('exceptionItemHeader-title')).toHaveTextContent('some name');
  });

  it('it displays actions', () => {
    const wrapper = render(
      <ThemeProvider theme={mockTheme}>
        <ExceptionItemCardHeader
          actions={actions}
          item={getExceptionListItemSchemaMock()}
          dataTestSubj="exceptionItemHeader"
        />
      </ThemeProvider>
    );

    // click on popover
    fireEvent.click(wrapper.getByTestId('exceptionItemHeader-actionButton'));
    fireEvent.click(wrapper.getByTestId('exceptionItemHeader-actionItem-edit'));
    expect(handleEdit).toHaveBeenCalled();

    fireEvent.click(wrapper.getByTestId('exceptionItemHeader-actionItem-delete'));
    expect(handleDelete).toHaveBeenCalled();
  });

  it('it disables actions if disableActions is true', () => {
    const wrapper = render(
      <ThemeProvider theme={mockTheme}>
        <ExceptionItemCardHeader
          actions={actions}
          item={getExceptionListItemSchemaMock()}
          disableActions
          dataTestSubj="exceptionItemHeader"
        />
      </ThemeProvider>
    );

    expect(wrapper.getByTestId('exceptionItemHeader-actionButton')).toBeDisabled();
  });
});
