/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mockData } from '../../../common/mocks/constants/session_view_process.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { ProcessTree } from './index';

describe('ProcessTree component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When ProcessTree is mounted', () => {
    it('should render given a valid sessionEntityId and Forward data', () => {
      renderResult = mockedContext.render(
        <ProcessTree
          sessionEntityId="1"
          data={mockData}
          isFetching={false}
          fetchNextPage={() => true}
          hasNextPage={false}
          fetchPreviousPage={() => true}
          hasPreviousPage={false}
        />);
      expect(renderResult.queryByTestId('sessionViewProcessTree')).toBeTruthy();
      expect(renderResult.queryByTestId('processTreeNode')).toBeTruthy();
    });
    describe('Orphaned childrens', () => {
      const mockEvents = mockData[0].events;

      const orphanedProcess = {
        ...mockEvents[0],
        process: {
          ...mockEvents[0].process,
          entity_id: 'orphaned-id',
          args: ['orphaned'],
          executable: 'orphaned',
          working_directory: 'orphaned',
          parent: {
            ...mockEvents[0].process.parent,
            entity_id: 'orphaned-parent-id',
          },
        },
      } as unknown as typeof mockEvents[0];

      it('should render orphaned children under the session leader', () => {
        mockEvents.push(orphanedProcess);

        renderResult = mockedContext.render(
          <ProcessTree
            sessionEntityId="1"
            data={mockData}
            isFetching={false}
            fetchNextPage={() => true}
            hasNextPage={false}
            fetchPreviousPage={() => true}
            hasPreviousPage={false}
          />
        );

        expect(renderResult.queryByText('orphaned')).toBeTruthy();
      });
    });
  });
});
