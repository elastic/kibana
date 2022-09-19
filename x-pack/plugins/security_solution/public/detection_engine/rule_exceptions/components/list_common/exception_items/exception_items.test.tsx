/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';

import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { ExceptionItems } from './exception_items';
import { getMockTheme } from '../../../../../common/lib/kibana/kibana_react.mock';
import { TestProviders } from '../../../../../common/mock';
import { ViewerStatus } from '../types';
import { render } from '@testing-library/react';

const mockTheme = getMockTheme({
  eui: {
    euiSize: '10px',
    euiColorPrimary: '#ece',
    euiColorDanger: '#ece',
    euiBreakpoints: {
      l: '400px',
    },
  },
});

const onCreateExceptionListItem = jest.fn();
const onDeleteException = jest.fn();
const onEditExceptionItem = jest.fn();
const onPaginationChange = jest.fn();

const pagination = { pageIndex: 0, pageSize: 0, totalItemCount: 0 };

describe('ExceptionsViewerItems', () => {
  describe('Viewing EmptyViewerState', () => {
    it('it renders empty prompt if "viewerStatus" is "empty"', () => {
      const wrapper = render(
        <TestProviders>
          <ExceptionItems
            viewerStatus={ViewerStatus.EMPTY}
            exceptions={[]}
            listType={ExceptionListTypeEnum.DETECTION}
            ruleReferences={{}}
            isReadOnly={false}
            pagination={pagination}
            lastUpdated={Date.now()}
            onCreateExceptionListItem={onCreateExceptionListItem}
            onDeleteException={onDeleteException}
            onEditExceptionItem={onEditExceptionItem}
            onPaginationChange={onPaginationChange}
          />
        </TestProviders>
      );
      expect(wrapper).toMatchSnapshot();
      expect(wrapper.getByTestId('empty_viewer_state')).toBeInTheDocument();
      expect(wrapper.queryByTestId('exceptionsContainer')).not.toBeInTheDocument();
    });

    it('it renders no search results found prompt if "viewerStatus" is "empty_search"', () => {
      const wrapper = render(
        <TestProviders>
          <ThemeProvider theme={mockTheme}>
            <ExceptionItems
              viewerStatus={ViewerStatus.EMPTY_SEARCH}
              exceptions={[]}
              listType={ExceptionListTypeEnum.DETECTION}
              ruleReferences={{}}
              lastUpdated={Date.now()}
              isReadOnly={false}
              pagination={pagination}
              onCreateExceptionListItem={onCreateExceptionListItem}
              onDeleteException={onDeleteException}
              onEditExceptionItem={onEditExceptionItem}
              onPaginationChange={onPaginationChange}
            />
          </ThemeProvider>
        </TestProviders>
      );
      expect(wrapper).toMatchSnapshot();
      expect(wrapper.getByTestId('empty_search_viewer_state')).toBeInTheDocument();
      expect(wrapper.queryByTestId('exceptionsContainer')).not.toBeInTheDocument();
    });

    it('it renders exceptions if "viewerStatus" and "null"', () => {
      const wrapper = render(
        <TestProviders>
          <ThemeProvider theme={mockTheme}>
            <ExceptionItems
              viewerStatus={'' as ViewerStatus}
              exceptions={[getExceptionListItemSchemaMock()]}
              listType={ExceptionListTypeEnum.DETECTION}
              ruleReferences={{}}
              isReadOnly={false}
              pagination={pagination}
              lastUpdated={Date.now()}
              onCreateExceptionListItem={onCreateExceptionListItem}
              onDeleteException={onDeleteException}
              onEditExceptionItem={onEditExceptionItem}
              onPaginationChange={onPaginationChange}
            />
          </ThemeProvider>
        </TestProviders>
      );
      expect(wrapper).toMatchSnapshot();
      expect(wrapper.getByTestId('exceptionsContainer')).toBeTruthy();
    });
  });
  // TODO Add Exception Items and Pagination interactions
});
