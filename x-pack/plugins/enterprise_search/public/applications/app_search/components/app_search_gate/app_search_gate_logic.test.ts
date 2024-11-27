/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { UpdateAppSearchGatedFormDataApiLogic } from './app_search_gate_api_logic';
import { AppSearchGateLogic } from './app_search_gate_logic';

const DEFAULT_VALUES = {
  additionalFeedback: null,
  feature: '',
  featuresOther: null,
  participateInUXLabs: null,
};

describe('Gated form data', () => {
  const { mount: apiLogicMount } = new LogicMounter(UpdateAppSearchGatedFormDataApiLogic);
  const { mount } = new LogicMounter(AppSearchGateLogic);
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    apiLogicMount();
    mount();
  });
  it('has expected default values', () => {
    expect(AppSearchGateLogic.values).toEqual(DEFAULT_VALUES);
  });
  describe('listeners', () => {
    it('make Request with only feature, participateInUXLabs response ', () => {
      jest.spyOn(AppSearchGateLogic.actions, 'submitGatedFormDataRequest');

      AppSearchGateLogic.actions.setFeature('Web Crawler');
      AppSearchGateLogic.actions.setParticipateInUXLabs(false);

      AppSearchGateLogic.actions.formSubmitRequest();

      expect(AppSearchGateLogic.actions.submitGatedFormDataRequest).toHaveBeenCalledTimes(1);
      expect(AppSearchGateLogic.actions.submitGatedFormDataRequest).toHaveBeenCalledWith({
        additionalFeedback: null,
        feature: 'Web Crawler',
        featuresOther: null,
        participateInUXLabs: false,
      });
    });

    it('when no feature selected, formSubmitRequest is not called', () => {
      jest.spyOn(AppSearchGateLogic.actions, 'submitGatedFormDataRequest');
      AppSearchGateLogic.actions.formSubmitRequest();

      expect(AppSearchGateLogic.actions.submitGatedFormDataRequest).toHaveBeenCalledTimes(0);
    });
  });
});
