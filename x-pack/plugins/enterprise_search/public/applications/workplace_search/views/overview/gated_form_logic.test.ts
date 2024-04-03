/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { UpdateGatedFormDataApiLogic } from './gated_form_api_logic';
import { WorkplaceSearchGateLogic } from './gated_form_logic';

const DEFAULT_VALUES = {
  additionalFeedback: null,
  feature: '',
  featuresOther: null,
  participateInUXLabs: null,
};

describe('Gated form data', () => {
  const { mount: apiLogicMount } = new LogicMounter(UpdateGatedFormDataApiLogic);
  const { mount } = new LogicMounter(WorkplaceSearchGateLogic);
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    apiLogicMount();
    mount();
  });
  it('has expected default values', () => {
    expect(WorkplaceSearchGateLogic.values).toEqual(DEFAULT_VALUES);
  });
  describe('listeners', () => {
    it('make Request with only feature, participateInUXLabs response ', () => {
      jest.spyOn(WorkplaceSearchGateLogic.actions, 'submitGatedFormDataRequest');

      WorkplaceSearchGateLogic.actions.setFeature('Content Sources');
      WorkplaceSearchGateLogic.actions.setParticipateInUXLabs(false);

      WorkplaceSearchGateLogic.actions.formSubmitRequest();

      expect(WorkplaceSearchGateLogic.actions.submitGatedFormDataRequest).toHaveBeenCalledTimes(1);
      expect(WorkplaceSearchGateLogic.actions.submitGatedFormDataRequest).toHaveBeenCalledWith({
        additionalFeedback: null,
        feature: 'Content Sources',
        featuresOther: null,
        participateInUXLabs: false,
      });
    });

    it('when no feature selected, formSubmitRequest is not called', () => {
      jest.spyOn(WorkplaceSearchGateLogic.actions, 'submitGatedFormDataRequest');
      WorkplaceSearchGateLogic.actions.formSubmitRequest();

      expect(WorkplaceSearchGateLogic.actions.submitGatedFormDataRequest).toHaveBeenCalledTimes(0);
    });
  });
});
