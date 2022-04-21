/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  mockData,
  mockAlerts,
  nullMockData,
  deepNullMockData,
} from '../../../common/mocks/constants/session_view_process.mock';
import { Process } from '../../../common/types/process_tree';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { ProcessTreeDeps, ProcessTree } from './index';

describe('ProcessTree component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  const sessionLeader = mockData[0].events![0];
  const props: ProcessTreeDeps = {
    sessionEntityId: sessionLeader.process!.entity_id!,
    data: mockData,
    alerts: mockAlerts,
    isFetching: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    fetchPreviousPage: jest.fn(),
    hasPreviousPage: false,
    onProcessSelected: jest.fn(),
    updatedAlertsStatus: {},
    onShowAlertDetails: jest.fn(),
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When ProcessTree is mounted', () => {
    it('should render given a valid sessionEntityId and data', () => {
      renderResult = mockedContext.render(<ProcessTree {...props} />);
      expect(renderResult.queryByTestId('sessionView:sessionViewProcessTree')).toBeTruthy();
      expect(renderResult.queryAllByTestId('sessionView:processTreeNode')).toBeTruthy();
    });

    it('should not crash given a valid sessionEntityId and data with empty object', () => {
      renderResult = mockedContext.render(<ProcessTree {...props} data={[{}]} />);
      expect(renderResult.queryByTestId('sessionView:sessionViewProcessTree')).toBeTruthy();
      expect(renderResult.queryAllByTestId('sessionView:processTreeNode')).toBeTruthy();
    });

    it('should not crash given a valid sessionEntityId and data with empty events', () => {
      renderResult = mockedContext.render(<ProcessTree {...props} data={[{ events: [{}] }]} />);
      expect(renderResult.queryByTestId('sessionView:sessionViewProcessTree')).toBeTruthy();
      expect(renderResult.queryAllByTestId('sessionView:processTreeNode')).toBeTruthy();
    });

    it('should not crash given a valid sessionEntityId and data with null fields', () => {
      renderResult = mockedContext.render(<ProcessTree {...props} data={nullMockData} />);
      expect(renderResult.queryByTestId('sessionView:sessionViewProcessTree')).toBeTruthy();
      expect(renderResult.queryAllByTestId('sessionView:processTreeNode')).toBeTruthy();
    });

    it('should not crash given a valid sessionEntityId and data with deep nested null fields', () => {
      renderResult = mockedContext.render(<ProcessTree {...props} data={deepNullMockData} />);
      expect(renderResult.queryByTestId('sessionView:sessionViewProcessTree')).toBeTruthy();
      expect(renderResult.queryAllByTestId('sessionView:processTreeNode')).toBeTruthy();
    });

    it('should auto select jumpToEvent when it exists and without selectedProcess', () => {
      const jumpToEvent = mockData[0].events![2];
      const onProcessSelected = jest.fn((process: Process | null) => {
        expect(process?.id).toBe(jumpToEvent.process!.entity_id!);
      });
      renderResult = mockedContext.render(
        <ProcessTree
          {...props}
          jumpToEntityId={jumpToEvent?.process?.entity_id}
          onProcessSelected={onProcessSelected}
        />
      );
      expect(renderResult.queryByTestId('sessionView:sessionViewProcessTree')).toBeTruthy();
      expect(renderResult.queryAllByTestId('sessionView:processTreeNode')).toBeTruthy();

      expect(onProcessSelected).toHaveBeenCalled();
    });

    it('should auto select session leader without selectedProcess', () => {
      const onProcessSelected = jest.fn((process: Process | null) => {
        expect(process?.id).toBe(sessionLeader.process!.entity_id!);
      });
      renderResult = mockedContext.render(
        <ProcessTree {...props} onProcessSelected={onProcessSelected} />
      );
      expect(renderResult.queryByTestId('sessionView:sessionViewProcessTree')).toBeTruthy();
      expect(renderResult.queryAllByTestId('sessionView:processTreeNode')).toBeTruthy();

      expect(onProcessSelected).toHaveBeenCalled();
    });

    it('When Verbose mode is OFF, it should not show all childrens', () => {
      renderResult = mockedContext.render(<ProcessTree {...props} verboseMode={false} />);
      expect(renderResult.queryByText('cat')).toBeFalsy();
    });

    it('When Verbose mode is ON, it should show all childrens', () => {
      renderResult = mockedContext.render(<ProcessTree {...props} verboseMode={true} />);
      expect(renderResult.queryByText('cat')).toBeTruthy();
    });
  });
});
