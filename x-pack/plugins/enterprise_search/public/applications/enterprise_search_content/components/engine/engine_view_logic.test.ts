/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { Status } from '../../../../../common/types/api';

import { KibanaLogic } from '../../../shared/kibana';
import { DeleteEnginesApiLogicResponse } from '../../api/engines/delete_engines_api_logic';
import { ENGINES_PATH } from '../../routes';
import { EnginesListLogic } from '../engines/engines_list_logic';

import { EngineViewLogic, EngineViewValues } from './engine_view_logic';

const DEFAULT_VALUES: EngineViewValues = {
  engineData: undefined,
  engineName: 'my-test-engine',
  fetchEngineApiError: undefined,
  fetchEngineApiStatus: Status.IDLE,
  isDeleteModalVisible: false,
  isLoadingEngine: true,
};

describe('EngineViewLogic', () => {
  const { mount } = new LogicMounter(EngineViewLogic);
  const { mount: mountEnginesListLogic } = new LogicMounter(EnginesListLogic);
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mountEnginesListLogic();
    mount({ engineName: DEFAULT_VALUES.engineName }, { engineName: DEFAULT_VALUES.engineName });
  });

  it('has expected default values', () => {
    expect(EngineViewLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('listeners', () => {
    describe('deleteSuccess', () => {
      it('should navigate to the engines list when an engine is deleted', () => {
        jest.spyOn(EngineViewLogic.actions, 'deleteSuccess');
        jest
          .spyOn(KibanaLogic.values, 'navigateToUrl')
          .mockImplementationOnce(() => Promise.resolve());
        EnginesListLogic.actions.deleteSuccess({} as DeleteEnginesApiLogicResponse);

        expect(KibanaLogic.values.navigateToUrl).toHaveBeenCalledWith(ENGINES_PATH);
      });
    });
  });
});
