/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../__mocks__/kea_logic';
import { connectorIndex } from '../../../__mocks__/view_index.mock';

import { ConnectorStatus, DisplayType } from '../../../../../../common/types/connectors';

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
            default_value: '',
            depends_on: [],
            display: DisplayType.TEXTBOX,
            label: 'newBar',
            options: [],
            order: 1,
            required: false,
            sensitive: false,
            tooltip: '',
            value: 'oldBar',
          },
        },
        indexName: 'indexName',
      });
      expect(ConnectorConfigurationLogic.values).toEqual({
        ...DEFAULT_VALUES,
        configState: {
          foo: {
            default_value: '',
            depends_on: [],
            display: DisplayType.TEXTBOX,
            label: 'newBar',
            options: [],
            order: 1,
            required: false,
            sensitive: false,
            tooltip: '',
            value: 'oldBar',
          },
        },
        configView: [
          {
            default_value: '',
            depends_on: [],
            display: DisplayType.TEXTBOX,
            key: 'foo',
            label: 'newBar',
            options: [],
            order: 1,
            required: false,
            sensitive: false,
            tooltip: '',
            value: 'oldBar',
          },
        ],
      });
    });
    it('should set config on setConfigState', () => {
      ConnectorConfigurationLogic.actions.setConfigState({
        foo: {
          default_value: '',
          depends_on: [],
          display: DisplayType.TEXTBOX,
          label: 'thirdBar',
          options: [],
          order: 1,
          required: false,
          sensitive: false,
          tooltip: '',
          value: 'fourthBar',
        },
      });
      expect(ConnectorConfigurationLogic.values).toEqual({
        ...DEFAULT_VALUES,
        configState: {
          foo: {
            default_value: '',
            depends_on: [],
            display: DisplayType.TEXTBOX,
            label: 'thirdBar',
            options: [],
            order: 1,
            required: false,
            sensitive: false,
            tooltip: '',
            value: 'fourthBar',
          },
        },
        configView: [
          {
            default_value: '',
            depends_on: [],
            display: DisplayType.TEXTBOX,
            key: 'foo',
            label: 'thirdBar',
            options: [],
            order: 1,
            required: false,
            sensitive: false,
            tooltip: '',
            value: 'fourthBar',
          },
        ],
      });
    });
    describe('setLocalConfigEntry', () => {
      it('should set local config entry and sort keys', () => {
        ConnectorConfigurationLogic.actions.setConfigState({
          bar: {
            default_value: '',
            depends_on: [],
            display: DisplayType.TEXTBOX,
            label: 'foo',
            options: [],
            order: 1,
            required: false,
            sensitive: false,
            tooltip: '',
            value: 'foofoo',
          },
          password: {
            default_value: '',
            depends_on: [],
            display: DisplayType.TEXTBOX,
            label: 'thirdBar',
            options: [],
            order: 2,
            required: false,
            sensitive: true,
            tooltip: '',
            value: 'fourthBar',
          },
        });
        ConnectorConfigurationLogic.actions.setLocalConfigState({
          bar: {
            default_value: '',
            depends_on: [],
            display: DisplayType.TEXTBOX,
            label: 'foo',
            options: [],
            order: 1,
            required: false,
            sensitive: false,
            tooltip: '',
            value: 'foofoo',
          },
          password: {
            default_value: '',
            depends_on: [],
            display: DisplayType.TEXTBOX,
            label: 'thirdBar',
            options: [],
            order: 2,
            required: false,
            sensitive: true,
            tooltip: '',
            value: 'fourthBar',
          },
        });
        ConnectorConfigurationLogic.actions.setLocalConfigEntry({
          default_value: '',
          depends_on: [],
          display: DisplayType.TEXTBOX,
          key: 'bar',
          label: 'foo',
          options: [],
          order: 1,
          required: false,
          sensitive: false,
          tooltip: '',
          value: 'fafa',
        });
        expect(ConnectorConfigurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          configState: {
            bar: {
              default_value: '',
              depends_on: [],
              display: DisplayType.TEXTBOX,
              label: 'foo',
              options: [],
              order: 1,
              required: false,
              sensitive: false,
              tooltip: '',
              value: 'foofoo',
            },
            password: {
              default_value: '',
              depends_on: [],
              display: DisplayType.TEXTBOX,
              label: 'thirdBar',
              options: [],
              order: 2,
              required: false,
              sensitive: true,
              tooltip: '',
              value: 'fourthBar',
            },
          },
          configView: [
            {
              default_value: '',
              depends_on: [],
              display: DisplayType.TEXTBOX,
              key: 'bar',
              label: 'foo',
              options: [],
              order: 1,
              required: false,
              sensitive: false,
              tooltip: '',
              value: 'foofoo',
            },
            {
              default_value: '',
              depends_on: [],
              display: DisplayType.TEXTBOX,
              key: 'password',
              label: 'thirdBar',
              options: [],
              order: 2,
              required: false,
              sensitive: true,
              tooltip: '',
              value: 'fourthBar',
            },
          ],
          localConfigState: {
            bar: {
              default_value: '',
              depends_on: [],
              display: DisplayType.TEXTBOX,
              label: 'foo',
              options: [],
              order: 1,
              required: false,
              sensitive: false,
              tooltip: '',
              value: 'fafa',
            },
            password: {
              default_value: '',
              depends_on: [],
              display: DisplayType.TEXTBOX,
              label: 'thirdBar',
              options: [],
              order: 2,
              required: false,
              sensitive: true,
              tooltip: '',
              value: 'fourthBar',
            },
          },
          localConfigView: [
            {
              default_value: '',
              depends_on: [],
              display: DisplayType.TEXTBOX,
              key: 'bar',
              label: 'foo',
              options: [],
              order: 1,
              required: false,
              sensitive: false,
              tooltip: '',
              value: 'fafa',
            },
            {
              default_value: '',
              depends_on: [],
              display: DisplayType.TEXTBOX,
              key: 'password',
              label: 'thirdBar',
              options: [],
              order: 2,
              required: false,
              sensitive: true,
              tooltip: '',
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
              default_value: '',
              depends_on: [],
              display: DisplayType.TEXTBOX,
              key: 'foo',
              label: 'bar',
              options: [],
              order: 1,
              required: false,
              sensitive: false,
              tooltip: '',
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
              default_value: '',
              depends_on: [],
              display: DisplayType.TEXTBOX,
              key: 'foo',
              label: 'bar',
              options: [],
              order: 1,
              required: false,
              sensitive: false,
              tooltip: '',
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
              default_value: '',
              depends_on: [],
              display: DisplayType.TEXTBOX,
              key: 'foo',
              label: 'bar',
              options: [],
              order: 1,
              required: false,
              sensitive: false,
              tooltip: '',
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
            default_value: '',
            depends_on: [],
            display: DisplayType.TEXTBOX,
            label: 'bar',
            options: [],
            order: 1,
            required: false,
            sensitive: true,
            tooltip: '',
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
