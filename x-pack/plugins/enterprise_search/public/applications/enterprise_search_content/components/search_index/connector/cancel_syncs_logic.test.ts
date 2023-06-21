/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../__mocks__/kea_logic';

import { indices } from '../../../__mocks__/search_indices.mock';

import { FetchIndexApiLogic } from '../../../api/index/fetch_index_api_logic';
import { IndexViewLogic } from '../index_view_logic';

import { CancelSyncsLogic } from './cancel_syncs_logic';

describe('CancelSyncsLogic', () => {
  const { mount } = new LogicMounter(CancelSyncsLogic);
  const { mount: IndexViewLogicMount } = new LogicMounter(IndexViewLogic);
  const { mount: FetchIndexApiLogicMount } = new LogicMounter(FetchIndexApiLogic);
  const DEFAULT_VALUES = {
    connectorId: null,
    isConnectorIndex: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    IndexViewLogicMount();
    FetchIndexApiLogicMount();
    mount();
  });
  it('has expected default values', () => {
    expect(CancelSyncsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('cancelSyncs', () => {
      it('should not call makeCancelSyncRequest if index is not a connector', () => {
        CancelSyncsLogic.actions.makeCancelSyncsRequest = jest.fn();
        CancelSyncsLogic.actions.cancelSyncs();
        expect(CancelSyncsLogic.actions.makeCancelSyncsRequest).not.toHaveBeenCalled();
      });
      it('should call clearFlashMessages and request if index is a connector', () => {
        CancelSyncsLogic.actions.makeCancelSyncsRequest = jest.fn();
        FetchIndexApiLogic.actions.apiSuccess(indices[1]);
        CancelSyncsLogic.actions.cancelSyncs();
        expect(CancelSyncsLogic.actions.makeCancelSyncsRequest).toHaveBeenCalled();
      });
    });
  });
});
