/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import '../../common/mock/match_media';
import { ExternalServiceColumn } from './columns';

import { useGetCasesMockState } from '../../containers/mock';
import { useKibana } from '../../common/lib/kibana';
import { actionTypeRegistryMock } from '../../../../triggers_actions_ui/public/application/action_type_registry.mock';
jest.mock('../../common/lib/kibana');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
describe('ExternalServiceColumn ', () => {
  beforeAll(() => {
    const actionType = actionTypeRegistryMock.createMockActionTypeModel({
      id: '.jira',
      validateConnector: () => {
        return Promise.resolve({});
      },
      validateParams: () => {
        const validationResult = { errors: {} };
        return Promise.resolve(validationResult);
      },
      actionConnectorFields: null,
    });

    useKibanaMock().services.triggersActionsUi.actionTypeRegistry.get = jest
      .fn()
      .mockReturnValue(actionType);
    useKibanaMock().services.triggersActionsUi.actionTypeRegistry.has = jest
      .fn()
      .mockReturnValue(true);
  });
  it('Not pushed render', () => {
    const wrapper = mount(
      <ExternalServiceColumn {...{ theCase: useGetCasesMockState.data.cases[0] }} />
    );
    expect(
      wrapper.find(`[data-test-subj="case-table-column-external-notPushed"]`).last().exists()
    ).toBeTruthy();
  });
  it('Up to date', () => {
    const wrapper = mount(
      <ExternalServiceColumn {...{ theCase: useGetCasesMockState.data.cases[1] }} />
    );
    expect(
      wrapper.find(`[data-test-subj="case-table-column-external-upToDate"]`).last().exists()
    ).toBeTruthy();
  });
  it('Needs update', () => {
    const wrapper = mount(
      <ExternalServiceColumn {...{ theCase: useGetCasesMockState.data.cases[2] }} />
    );
    expect(
      wrapper.find(`[data-test-subj="case-table-column-external-requiresUpdate"]`).last().exists()
    ).toBeTruthy();
  });
});
