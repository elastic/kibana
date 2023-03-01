/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { Status } from '../../../../../common/types/api';
import { ElasticsearchIndexWithIngestion } from '../../../../../common/types/indices';

import { AddIndicesLogic, AddIndicesLogicValues } from './add_indices_logic';

const DEFAULT_VALUES: AddIndicesLogicValues = {
  selectedIndices: [],
  updateEngineError: undefined,
  updateEngineStatus: Status.IDLE,
};

const makeIndexData = (name: string): ElasticsearchIndexWithIngestion => ({
  count: 0,
  hidden: false,
  name,
  total: {
    docs: { count: 0, deleted: 0 },
    store: { size_in_bytes: 'n/a' },
  },
});

describe('AddIndicesLogic', () => {
  const { mount: mountAddIndicesLogic } = new LogicMounter(AddIndicesLogic);
  const { mount: mountEngineIndicesLogic } = new LogicMounter(AddIndicesLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mountAddIndicesLogic();
    mountEngineIndicesLogic();
  });

  it('has expected default values', () => {
    expect(AddIndicesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setSelectedIndices', () => {
      it('adds the indices to selectedIndices', () => {
        AddIndicesLogic.actions.setSelectedIndices([
          makeIndexData('index-001'),
          makeIndexData('index-002'),
        ]);

        expect(AddIndicesLogic.values.selectedIndices).toEqual([
          makeIndexData('index-001'),
          makeIndexData('index-002'),
        ]);
      });

      it('replaces any existing indices', () => {
        AddIndicesLogic.actions.setSelectedIndices([
          makeIndexData('index-001'),
          makeIndexData('index-002'),
        ]);
        AddIndicesLogic.actions.setSelectedIndices([
          makeIndexData('index-003'),
          makeIndexData('index-004'),
        ]);

        expect(AddIndicesLogic.values.selectedIndices).toEqual([
          makeIndexData('index-003'),
          makeIndexData('index-004'),
        ]);
      });
    });
  });

  describe('listeners', () => {
    describe('engineUpdated', () => {
      it('closes the add indices flyout', () => {
        jest.spyOn(AddIndicesLogic.actions, 'closeAddIndicesFlyout');

        AddIndicesLogic.actions.engineUpdated({
          created: '1999-12-31T23:59:59Z',
          indices: [],
          name: 'engine-name',
          updated: '1999-12-31T23:59:59Z',
        });

        expect(AddIndicesLogic.actions.closeAddIndicesFlyout).toHaveBeenCalledTimes(1);
      });
    });

    describe('submitSelectedIndices', () => {
      it('does not make a request if there are no selectedIndices', () => {
        jest.spyOn(AddIndicesLogic.actions, 'addIndicesToEngine');

        AddIndicesLogic.actions.submitSelectedIndices();

        expect(AddIndicesLogic.actions.addIndicesToEngine).toHaveBeenCalledTimes(0);
      });

      it('calls addIndicesToEngine when there are selectedIndices', () => {
        jest.spyOn(AddIndicesLogic.actions, 'addIndicesToEngine');

        AddIndicesLogic.actions.setSelectedIndices([
          makeIndexData('index-001'),
          makeIndexData('index-002'),
        ]);
        AddIndicesLogic.actions.submitSelectedIndices();

        expect(AddIndicesLogic.actions.addIndicesToEngine).toHaveBeenCalledTimes(1);
        expect(AddIndicesLogic.actions.addIndicesToEngine).toHaveBeenCalledWith([
          'index-001',
          'index-002',
        ]);
      });
    });
  });
});
