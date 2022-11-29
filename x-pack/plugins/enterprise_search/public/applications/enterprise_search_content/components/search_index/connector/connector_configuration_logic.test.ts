/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../../__mocks__/kea_logic';
import { connectorIndex } from '../../../__mocks__/view_index.mock';

import { ConnectorConfigurationApiLogic } from '../../../api/connector/update_connector_configuration_api_logic';
import { CachedFetchIndexApiLogic } from '../../../api/index/cached_fetch_index_api_logic';

import { IndexNameLogic } from '../index_name_logic';
import { IndexViewLogic } from '../index_view_logic';

import { ConnectorConfigurationLogic } from './connector_configuration_logic';

const DEFAULT_VALUES = {
  configState: {},
  configView: [],
  index: null,
  isEditing: false,
  localConfigState: {},
  localConfigView: [],
};

describe('ConnectorConfigurationLogic', () => {
  const { mount } = new LogicMounter(ConnectorConfigurationLogic);
  const { mount: mountIndexNameLogic } = new LogicMounter(IndexNameLogic);
  const { mount: mountFetchIndexApiWrapperLogic } = new LogicMounter(CachedFetchIndexApiLogic);
  const { mount: mountIndexViewLogic } = new LogicMounter(IndexViewLogic);
  const { clearFlashMessages, flashAPIErrors, flashSuccessToast } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
    mountIndexNameLogic({ indexName: 'index-name' }, { indexName: 'index-name' });
    mountFetchIndexApiWrapperLogic();
    mountIndexViewLogic({ index: 'index' });
    mount();
  });

  it('has expected default values', () => {
    expect(ConnectorConfigurationLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    it('should set config and isEditing on apiSuccess', () => {
      ConnectorConfigurationLogic.actions.setIsEditing(true);
      ConnectorConfigurationApiLogic.actions.apiSuccess({
        configuration: { foo: { label: 'newBar', value: 'oldBar' } },
        indexName: 'indexName',
      });
      expect(ConnectorConfigurationLogic.values).toEqual({
        ...DEFAULT_VALUES,
        configState: { foo: { label: 'newBar', value: 'oldBar' } },
        configView: [{ key: 'foo', label: 'newBar', value: 'oldBar' }],
      });
    });
    it('should set config on setConfigState', () => {
      ConnectorConfigurationLogic.actions.setConfigState({
        foo: { label: 'thirdBar', value: 'fourthBar' },
      });
      expect(ConnectorConfigurationLogic.values).toEqual({
        ...DEFAULT_VALUES,
        configState: { foo: { label: 'thirdBar', value: 'fourthBar' } },
        configView: [{ key: 'foo', label: 'thirdBar', value: 'fourthBar' }],
      });
    });
    describe('makeRequest', () => {
      it('should call clearFlashMessages', () => {
        ConnectorConfigurationLogic.actions.makeRequest({
          configuration: {},
          connectorId: 'id',
          indexName: 'name',
        });
        expect(clearFlashMessages).toHaveBeenCalled();
      });
    });
    describe('apiError', () => {
      it('should call flashAPIError', () => {
        ConnectorConfigurationLogic.actions.apiError('error' as any);
        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
    describe('apiSuccess', () => {
      it('should call flashAPIError', () => {
        ConnectorConfigurationLogic.actions.apiSuccess({
          configuration: {},
          indexName: 'name',
        });
        expect(flashSuccessToast).toHaveBeenCalledWith('Configuration successfully updated');
      });
    });
    describe('setLocalConfigEntry', () => {
      it('should set local config entry and sort keys', () => {
        ConnectorConfigurationLogic.actions.setConfigState({
          bar: { label: 'foo', value: 'foofoo' },
          foo: { label: 'thirdBar', value: 'fourthBar' },
        });
        ConnectorConfigurationLogic.actions.setLocalConfigState({
          bar: { label: 'foo', value: 'foofoo' },
          foo: { label: 'thirdBar', value: 'fourthBar' },
        });
        ConnectorConfigurationLogic.actions.setLocalConfigEntry({
          key: 'bar',
          label: 'foo',
          value: 'fafa',
        });
        expect(ConnectorConfigurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          configState: {
            bar: { label: 'foo', value: 'foofoo' },
            foo: { label: 'thirdBar', value: 'fourthBar' },
          },
          configView: [
            { key: 'bar', label: 'foo', value: 'foofoo' },
            { key: 'foo', label: 'thirdBar', value: 'fourthBar' },
          ],
          localConfigState: {
            bar: { label: 'foo', value: 'fafa' },
            foo: { label: 'thirdBar', value: 'fourthBar' },
          },
          localConfigView: [
            { key: 'bar', label: 'foo', value: 'fafa' },
            { key: 'foo', label: 'thirdBar', value: 'fourthBar' },
          ],
        });
      });
    });
    describe('fetchIndexApiSuccess', () => {
      it('should set configState if not editing', () => {
        ConnectorConfigurationLogic.actions.fetchIndexApiSuccess(connectorIndex);
        expect(ConnectorConfigurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          configState: connectorIndex.connector.configuration,
          configView: [{ key: 'foo', label: 'bar', value: 'barbar' }],
          index: connectorIndex,
        });
      });
      it('should not set configState if editing', () => {
        ConnectorConfigurationLogic.actions.setIsEditing(true);
        ConnectorConfigurationLogic.actions.fetchIndexApiSuccess(connectorIndex);
        expect(ConnectorConfigurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          index: connectorIndex,
          isEditing: true,
        });
      });
    });
    describe('saveConfig', () => {
      it('should call makeRequest', () => {
        ConnectorConfigurationLogic.actions.makeRequest = jest.fn();
        ConnectorConfigurationLogic.actions.fetchIndexApiSuccess(connectorIndex);
        ConnectorConfigurationLogic.actions.setLocalConfigState({
          foo: { label: 'bar', value: 'Barbara' },
        });
        ConnectorConfigurationLogic.actions.saveConfig();
        expect(ConnectorConfigurationLogic.actions.makeRequest).toHaveBeenCalledWith({
          configuration: { foo: { label: 'bar', value: 'Barbara' } },
          connectorId: '2',
          indexName: 'connector',
        });
      });
    });
  });
});
