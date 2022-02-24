/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mockData } from '../../../common/mocks/constants/session_view_process.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { ProcessImpl } from './hooks';
import { ProcessTree } from './index';

describe('ProcessTree component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When ProcessTree is mounted', () => {
    it('should render given a valid sessionEntityId and data', () => {
      renderResult = mockedContext.render(
        <ProcessTree
          sessionEntityId="3d0192c6-7c54-5ee6-a110-3539a7cf42bc"
          data={mockData}
          isFetching={false}
          fetchNextPage={() => true}
          hasNextPage={false}
          fetchPreviousPage={() => true}
          hasPreviousPage={false}
          onProcessSelected={jest.fn()}
        />
      );
      expect(renderResult.queryByTestId('sessionViewProcessTree')).toBeTruthy();
      expect(renderResult.queryAllByTestId('processTreeNode')).toBeTruthy();
    });

    it('should insert a DOM element used to highlight a process when selectedProcess is set', () => {
      const mockSelectedProcess = new ProcessImpl(mockData[0].events[0].process.entity_id);

      renderResult = mockedContext.render(
        <ProcessTree
          sessionEntityId="3d0192c6-7c54-5ee6-a110-3539a7cf42bc"
          data={mockData}
          isFetching={false}
          fetchNextPage={() => true}
          hasNextPage={false}
          fetchPreviousPage={() => true}
          hasPreviousPage={false}
          selectedProcess={mockSelectedProcess}
          onProcessSelected={jest.fn()}
        />
      );

      expect(
        renderResult
        .queryByTestId('sessionView:processTreeSelectionArea')
        ?.parentElement?.getAttribute('data-id')
      ).toEqual(mockSelectedProcess.id);

      // change the selected process
      const mockSelectedProcess2 = new ProcessImpl(mockData[0].events[1].process.entity_id);

      renderResult.rerender(
        <ProcessTree
          sessionEntityId="3d0192c6-7c54-5ee6-a110-3539a7cf42bc"
          data={mockData}
          isFetching={false}
          fetchNextPage={() => true}
          hasNextPage={false}
          fetchPreviousPage={() => true}
          hasPreviousPage={false}
          selectedProcess={mockSelectedProcess2}
          onProcessSelected={jest.fn()}
        />
      );

      expect(
        renderResult
        .queryByTestId('sessionView:processTreeSelectionArea')
        ?.parentElement?.getAttribute('data-id')
      ).toEqual(mockSelectedProcess2.id);
    });
  });
});
