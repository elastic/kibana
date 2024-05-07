/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// draggable_cell_actions.test.tsx

import React from 'react';
import { render } from '@testing-library/react';
import { DraggableCellActions } from './draggable_cell_actions';
import { CellActionsMode, SecurityCellActionType } from '../cell_actions';
import { TimelineId } from '../../../../common/types';

const MockSecurityCellActions = jest.fn(({ children }: { children: React.ReactNode }) => (
  <div data-test-subj="mockSecurityCellActions">{children}</div>
));
jest.mock('../cell_actions', () => ({
  ...jest.requireActual('../cell_actions'),
  SecurityCellActions: (params: { children: React.ReactNode }) => MockSecurityCellActions(params),
}));

const mockSourcererScopeId = 'testSourcererScopeId';
jest.mock('../../../helpers', () => ({
  getSourcererScopeId: jest.fn(() => mockSourcererScopeId),
}));

const data = [{ field: 'host.name', value: '12345' }];

describe('DraggableCellActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render cell actions with the content', () => {
    const result = render(
      <DraggableCellActions data={data}>{'test children'}</DraggableCellActions>
    );
    expect(result.queryByTestId('mockSecurityCellActions')).toBeInTheDocument();
    expect(result.queryByText('test children')).toBeInTheDocument();
  });

  it('should call cell actions with the default props', () => {
    render(<DraggableCellActions data={data}>{'test children'}</DraggableCellActions>);
    expect(MockSecurityCellActions).toHaveBeenCalledWith(
      expect.objectContaining({
        data,
        mode: CellActionsMode.HOVER_DOWN,
        sourcererScopeId: mockSourcererScopeId,
        disabledActionTypes: [],
        metadata: { scopeId: TimelineId.active },
      })
    );
  });

  describe('when scopeId is defined', () => {
    it('should set the scopeId to the SecurityCellActions component metadata', () => {
      render(
        <DraggableCellActions data={data} scopeId="testScopeId">
          {'test children'}
        </DraggableCellActions>
      );
      expect(MockSecurityCellActions).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { scopeId: 'testScopeId' } })
      );
    });
  });

  describe('when hideTopN is true', () => {
    it('should set the disabledActionTypes to the SecurityCellActions component metadata', () => {
      render(
        <DraggableCellActions data={data} hideTopN>
          {'test children'}
        </DraggableCellActions>
      );
      expect(MockSecurityCellActions).toHaveBeenCalledWith(
        expect.objectContaining({ disabledActionTypes: [SecurityCellActionType.SHOW_TOP_N] })
      );
    });
  });
});
