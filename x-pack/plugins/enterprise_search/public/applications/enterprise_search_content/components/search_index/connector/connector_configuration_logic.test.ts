/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../__mocks__/kea_logic';
import { connectorIndex } from '../../../__mocks__/view_index.mock';

import { ConnectorStatus } from '../../../../../../common/types/connectors';

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
  shouldStartInEditMode: false,
};

describe('ConnectorConfigurationLogic', () => {
  const { mount } = new LogicMounter(ConnectorConfigurationLogic);
  const { mount: mountIndexNameLogic } = new LogicMounter(IndexNameLogic);
  const { mount: mountFetchIndexApiWrapperLogic } = new LogicMounter(CachedFetchIndexApiLogic);
  const { mount: mountIndexViewLogic } = new LogicMounter(IndexViewLogic);

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
        configuration: {
          foo: {
            display: 'textbox',
            label: 'newBar',
            options: [],
            order: 1,
            sensitive: false,
            value: 'oldBar',
          },
        },
        indexName: 'indexName',
      });
      expect(ConnectorConfigurationLogic.values).toEqual({
        ...DEFAULT_VALUES,
        configState: {
          foo: {
            display: 'textbox',
            label: 'newBar',
            options: [],
            order: 1,
            sensitive: false,
            value: 'oldBar',
          },
        },
        configView: [
          {
            display: 'textbox',
            key: 'foo',
            label: 'newBar',
            options: [],
            order: 1,
            sensitive: false,
            value: 'oldBar',
          },
        ],
      });
    });
    it('should set config on setConfigState', () => {
      ConnectorConfigurationLogic.actions.setConfigState({
        foo: {
          display: 'textbox',
          label: 'thirdBar',
          options: [],
          order: 1,
          sensitive: false,
          value: 'fourthBar',
        },
      });
      expect(ConnectorConfigurationLogic.values).toEqual({
        ...DEFAULT_VALUES,
        configState: {
          foo: {
            display: 'textbox',
            label: 'thirdBar',
            options: [],
            order: 1,
            sensitive: false,
            value: 'fourthBar',
          },
        },
        configView: [
          {
            display: 'textbox',
            key: 'foo',
            label: 'thirdBar',
            options: [],
            order: 1,
            sensitive: false,
            value: 'fourthBar',
          },
        ],
      });
    });
    describe('setLocalConfigEntry', () => {
      it('should set local config entry and sort keys', () => {
        ConnectorConfigurationLogic.actions.setConfigState({
          bar: {
            display: 'textbox',
            label: 'foo',
            options: [],
            order: 1,
            sensitive: false,
            value: 'foofoo',
          },
          password: {
            display: 'textbox',
            label: 'thirdBar',
            options: [],
            order: 2,
            sensitive: true,
            value: 'fourthBar',
          },
        });
        ConnectorConfigurationLogic.actions.setLocalConfigState({
          bar: {
            display: 'textbox',
            label: 'foo',
            options: [],
            order: 1,
            sensitive: false,
            value: 'foofoo',
          },
          password: {
            display: 'textbox',
            label: 'thirdBar',
            options: [],
            order: 2,
            sensitive: true,
            value: 'fourthBar',
          },
        });
        ConnectorConfigurationLogic.actions.setLocalConfigEntry({
          display: 'textbox',
          key: 'bar',
          label: 'foo',
          options: [],
          order: 1,
          sensitive: false,
          value: 'fafa',
        });
        expect(ConnectorConfigurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          configState: {
            bar: {
              display: 'textbox',
              label: 'foo',
              options: [],
              order: 1,
              sensitive: false,
              value: 'foofoo',
            },
            password: {
              display: 'textbox',
              label: 'thirdBar',
              options: [],
              order: 2,
              sensitive: true,
              value: 'fourthBar',
            },
          },
          configView: [
            {
              display: 'textbox',
              key: 'bar',
              label: 'foo',
              options: [],
              order: 1,
              sensitive: false,
              value: 'foofoo',
            },
            {
              display: 'textbox',
              key: 'password',
              label: 'thirdBar',
              options: [],
              order: 2,
              sensitive: true,
              value: 'fourthBar',
            },
          ],
          localConfigState: {
            bar: {
              display: 'textbox',
              label: 'foo',
              options: [],
              order: 1,
              sensitive: false,
              value: 'fafa',
            },
            password: {
              display: 'textbox',
              label: 'thirdBar',
              options: [],
              order: 2,
              sensitive: true,
              value: 'fourthBar',
            },
          },
          localConfigView: [
            {
              display: 'textbox',
              key: 'bar',
              label: 'foo',
              options: [],
              order: 1,
              sensitive: false,
              value: 'fafa',
            },
            {
              display: 'textbox',
              key: 'password',
              label: 'thirdBar',
              options: [],
              order: 2,
              sensitive: true,
              value: 'fourthBar',
            },
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
          configView: [
            {
              display: 'textbox',
              key: 'foo',
              label: 'bar',
              options: [],
              order: 1,
              sensitive: false,
              value: 'barbar',
            },
          ],
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
      it('should set isEditing if connector has a config definition and shouldStartInEditMode is true', () => {
        ConnectorConfigurationLogic.actions.setShouldStartInEditMode(true);
        ConnectorConfigurationLogic.actions.fetchIndexApiSuccess({
          ...connectorIndex,
          connector: { ...connectorIndex.connector, status: ConnectorStatus.NEEDS_CONFIGURATION },
        });
        expect(ConnectorConfigurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          configState: connectorIndex.connector.configuration,
          configView: [
            {
              display: 'textbox',
              key: 'foo',
              label: 'bar',
              options: [],
              order: 1,
              sensitive: false,
              value: 'barbar',
            },
          ],
          index: {
            ...connectorIndex,
            connector: { ...connectorIndex.connector, status: ConnectorStatus.NEEDS_CONFIGURATION },
          },
          isEditing: true,
          localConfigState: connectorIndex.connector.configuration,
          localConfigView: [
            {
              display: 'textbox',
              key: 'foo',
              label: 'bar',
              options: [],
              order: 1,
              sensitive: false,
              value: 'barbar',
            },
          ],
          shouldStartInEditMode: true,
        });
      });
    });
    describe('saveConfig', () => {
      it('should call makeRequest', () => {
        ConnectorConfigurationLogic.actions.makeRequest = jest.fn();
        ConnectorConfigurationLogic.actions.fetchIndexApiSuccess(connectorIndex);
        ConnectorConfigurationLogic.actions.setLocalConfigState({
          foo: {
            display: 'textbox',
            label: 'bar',
            options: [],
            order: 1,
            sensitive: true,
            value: 'Barbara',
          },
        });
        ConnectorConfigurationLogic.actions.saveConfig();
        expect(ConnectorConfigurationLogic.actions.makeRequest).toHaveBeenCalledWith({
          configuration: { foo: 'Barbara' },
          connectorId: '2',
          indexName: 'connector',
        });
      });
    });
  });
});
