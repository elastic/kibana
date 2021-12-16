/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mockEvents } from '../../../common/mocks/constants/session_view_process.mock';
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
      renderResult = mockedContext.render(<ProcessTree sessionEntityId="1" forward={mockEvents} />);
      expect(renderResult.queryByTestId('sessionViewProcessTree')).toBeTruthy();
      expect(renderResult.queryByTestId('processTreeNode')).toBeTruthy();
    });
    describe('Orphaned childrens', () => {
      const orphanedProcess = {
        ...mockEvents[0],
        process: {
          ...mockEvents[0].process,
          parent: {
            ...mockEvents[0].process.parent,
            entity_id: 'orphaned-id',
          },
        },
      } as unknown as typeof mockEvents[0];

      it('should render orphaned childrens if hideOrphans set to false', () => {
        renderResult = mockedContext.render(
          <ProcessTree
            sessionEntityId="1"
            forward={mockEvents.concat(orphanedProcess)}
            hideOrphans={false}
          />
        );

        expect(renderResult.queryByText(/orphaned/i)).toBeTruthy();
      });
      it('should not render orphaned childrens if hideOrphans set to true', () => {
        renderResult = mockedContext.render(
          <ProcessTree
            sessionEntityId="1"
            forward={mockEvents.concat(orphanedProcess)}
            hideOrphans={true}
          />
        );

        expect(renderResult.queryByText(/orphaned/i)).toBeFalsy();
      });
    });
  });
});
