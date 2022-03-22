/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mockData, mockAlerts } from '../../../common/mocks/constants/session_view_process.mock';
import { Process } from '../../../common/types/process_tree';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { ProcessImpl } from './hooks';
import { ProcessTree } from './index';

describe('ProcessTree component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  const sessionLeader = mockData[0].events[0];
  const sessionLeaderVerboseTest = mockData[0].events[3];

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When ProcessTree is mounted', () => {
    it('should render given a valid sessionEntityId and data', () => {
      renderResult = mockedContext.render(
        <ProcessTree
          sessionEntityId={sessionLeader.process.entity_id}
          data={mockData}
          alerts={mockAlerts}
          isFetching={false}
          fetchNextPage={() => true}
          hasNextPage={false}
          fetchPreviousPage={() => true}
          hasPreviousPage={false}
          onProcessSelected={jest.fn()}
        />
      );
      expect(renderResult.queryByTestId('sessionView:sessionViewProcessTree')).toBeTruthy();
      expect(renderResult.queryAllByTestId('sessionView:processTreeNode')).toBeTruthy();
    });

    it('should auto select jumpToEvent when it exists and without selectedProcess', () => {
      const jumpToEvent = mockData[0].events[2];
      const onProcessSelected = jest.fn((process: Process | null) => {
        expect(process?.id).toBe(jumpToEvent.process.entity_id);
      });
      renderResult = mockedContext.render(
        <ProcessTree
          sessionEntityId={sessionLeader.process.entity_id}
          data={mockData}
          alerts={mockAlerts}
          isFetching={false}
          fetchNextPage={() => true}
          hasNextPage={false}
          fetchPreviousPage={() => true}
          hasPreviousPage={false}
          jumpToEvent={jumpToEvent}
          onProcessSelected={onProcessSelected}
        />
      );
      expect(renderResult.queryByTestId('sessionView:sessionViewProcessTree')).toBeTruthy();
      expect(renderResult.queryAllByTestId('sessionView:processTreeNode')).toBeTruthy();

      expect(onProcessSelected).toHaveBeenCalled();
    });

    it('should auto select session leader without selectedProcess', () => {
      const onProcessSelected = jest.fn((process: Process | null) => {
        expect(process?.id).toBe(sessionLeader.process.entity_id);
      });
      renderResult = mockedContext.render(
        <ProcessTree
          sessionEntityId={sessionLeader.process.entity_id}
          data={mockData}
          alerts={mockAlerts}
          isFetching={false}
          fetchNextPage={() => true}
          hasNextPage={false}
          fetchPreviousPage={() => true}
          hasPreviousPage={false}
          onProcessSelected={onProcessSelected}
        />
      );
      expect(renderResult.queryByTestId('sessionView:sessionViewProcessTree')).toBeTruthy();
      expect(renderResult.queryAllByTestId('sessionView:processTreeNode')).toBeTruthy();

      expect(onProcessSelected).toHaveBeenCalled();
    });

    it('When Verbose mode is OFF, it should not show all childrens', () => {
      renderResult = mockedContext.render(
        <ProcessTree
          sessionEntityId={sessionLeader.process.entity_id}
          data={mockData}
          alerts={mockAlerts}
          isFetching={false}
          fetchNextPage={() => true}
          hasNextPage={false}
          fetchPreviousPage={() => true}
          hasPreviousPage={false}
          onProcessSelected={jest.fn()}
          timeStampOn={true}
          verboseModeOn={false}
        />
      );
      expect(renderResult.queryByText('cat')).toBeFalsy();

      const selectionArea = renderResult.queryAllByTestId('sessionView:processTreeNode');
      const result = selectionArea.map((a) => a?.getAttribute('data-id'));

      expect(result.includes(sessionLeader.process.entity_id)).toBeTruthy();
      expect(result.includes(sessionLeaderVerboseTest.process.entity_id)).toBeFalsy();
    });

    it('When Verbose mode is ON, it should show all childrens', () => {
      renderResult = mockedContext.render(
        <ProcessTree
          sessionEntityId={sessionLeader.process.entity_id}
          data={mockData}
          alerts={mockAlerts}
          isFetching={false}
          fetchNextPage={() => true}
          hasNextPage={false}
          fetchPreviousPage={() => true}
          hasPreviousPage={false}
          onProcessSelected={jest.fn()}
          timeStampOn={true}
          verboseModeOn={true}
        />
      );
      expect(renderResult.queryByText('cat')).toBeTruthy();

      const selectionArea = renderResult.queryAllByTestId('sessionView:processTreeNode');
      const result = selectionArea.map((a) => a?.getAttribute('data-id'));

      expect(result.includes(sessionLeader.process.entity_id)).toBeTruthy();
      expect(result.includes(sessionLeaderVerboseTest.process.entity_id)).toBeTruthy();
    });

    it('should insert a DOM element used to highlight a process when selectedProcess is set', () => {
      const mockSelectedProcess = new ProcessImpl(mockData[0].events[0].process.entity_id);

      renderResult = mockedContext.render(
        <ProcessTree
          sessionEntityId={sessionLeader.process.entity_id}
          data={mockData}
          alerts={mockAlerts}
          isFetching={false}
          fetchNextPage={() => true}
          hasNextPage={false}
          fetchPreviousPage={() => true}
          hasPreviousPage={false}
          selectedProcess={mockSelectedProcess}
          onProcessSelected={jest.fn()}
          verboseModeOn={true}
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
          sessionEntityId={sessionLeader.process.entity_id}
          data={mockData}
          alerts={mockAlerts}
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
