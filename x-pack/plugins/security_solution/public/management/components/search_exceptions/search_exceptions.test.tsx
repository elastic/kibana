/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent } from '@testing-library/react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../common/mock/endpoint';

import { SearchExceptions, SearchExceptionsProps } from '.';

let onSearchMock: jest.Mock;

jest.mock('../../../common/components/user_privileges/use_endpoint_privileges');

describe('Search exceptions', () => {
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: (
    props?: Partial<SearchExceptionsProps>
  ) => ReturnType<AppContextTestRender['render']>;

  beforeEach(() => {
    onSearchMock = jest.fn();
    appTestContext = createAppRootMockRenderer();

    render = (overrideProps = {}) => {
      const props: SearchExceptionsProps = {
        placeholder: 'search test',
        onSearch: onSearchMock,
        ...overrideProps,
      };

      renderResult = appTestContext.render(<SearchExceptions {...props} />);
      return renderResult;
    };
  });

  it('should have a default value', () => {
    const expectedDefaultValue = 'this is a default value';
    const element = render({ defaultValue: expectedDefaultValue });

    expect(element.getByDisplayValue(expectedDefaultValue)).not.toBeNull();
  });

  it('should dispatch search action when submit search field', () => {
    const expectedDefaultValue = 'this is a default value';
    const element = render();
    expect(onSearchMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.change(element.getByTestId('searchField'), {
        target: { value: expectedDefaultValue },
      });
    });

    expect(onSearchMock).toHaveBeenCalledTimes(1);
    expect(onSearchMock).toHaveBeenCalledWith(expectedDefaultValue, '', '');
  });

  it('should dispatch search action when click on button', () => {
    const expectedDefaultValue = 'this is a default value';
    const element = render({ defaultValue: expectedDefaultValue });
    expect(onSearchMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.click(element.getByTestId('searchButton'));
    });

    expect(onSearchMock).toHaveBeenCalledTimes(1);
    expect(onSearchMock).toHaveBeenCalledWith(expectedDefaultValue, '', '');
  });

  it('should hide refresh button', () => {
    const element = render({ hideRefreshButton: true });

    expect(element.queryByTestId('searchButton')).toBeNull();
  });
});
