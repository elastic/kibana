/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogicMounter } from '../../../../../__mocks__/kea.mock';

import { mockFlashMessageHelpers, mockHttpValues } from '../../../../../__mocks__';

const contentSource = { id: 'source123' };
jest.mock('../../source_logic', () => ({
  SourceLogic: { values: { contentSource } },
}));

import { AppLogic } from '../../../../app_logic';
jest.mock('../../../../app_logic', () => ({
  AppLogic: { values: { isOrganization: true } },
}));

import { nextTick } from '@kbn/test/jest';

import { exampleResult } from '../../../../__mocks__/content_sources.mock';
import { LEAVE_UNASSIGNED_FIELD } from './constants';

import { DisplaySettingsLogic, defaultSearchResultConfig } from './display_settings_logic';

describe('DisplaySettingsLogic', () => {
  const { http } = mockHttpValues;
  const { clearFlashMessages, flashAPIErrors, setSuccessMessage } = mockFlashMessageHelpers;
  const { mount } = new LogicMounter(DisplaySettingsLogic);

  const { searchResultConfig, exampleDocuments } = exampleResult;

  const defaultValues = {
    sourceName: '',
    sourceId: '',
    schemaFields: {},
    exampleDocuments: [],
    serverSearchResultConfig: defaultSearchResultConfig,
    searchResultConfig: defaultSearchResultConfig,
    serverRoute: '',
    editFieldIndex: null,
    dataLoading: true,
    addFieldModalVisible: false,
    titleFieldHover: false,
    urlFieldHover: false,
    subtitleFieldHover: false,
    descriptionFieldHover: false,
    fieldOptions: [],
    optionalFieldOptions: [
      {
        value: LEAVE_UNASSIGNED_FIELD,
        text: LEAVE_UNASSIGNED_FIELD,
      },
    ],
    availableFieldOptions: [],
    unsavedChanges: false,
  };

  const serverProps = {
    sourceName: 'foo',
    sourceId: '123',
    serverRoute: '/foo',
    searchResultConfig,
    exampleDocuments,
    schemaFields: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(DisplaySettingsLogic.values).toEqual(defaultValues);
  });

  describe('actions', () => {
    it('onInitializeDisplaySettings', () => {
      DisplaySettingsLogic.actions.onInitializeDisplaySettings(serverProps);

      expect(DisplaySettingsLogic.values.sourceName).toEqual(serverProps.sourceName);
      expect(DisplaySettingsLogic.values.sourceId).toEqual(serverProps.sourceId);
      expect(DisplaySettingsLogic.values.schemaFields).toEqual(serverProps.schemaFields);
      expect(DisplaySettingsLogic.values.exampleDocuments).toEqual(serverProps.exampleDocuments);
      expect(DisplaySettingsLogic.values.searchResultConfig).toEqual(
        serverProps.searchResultConfig
      );
      expect(DisplaySettingsLogic.values.serverRoute).toEqual(serverProps.serverRoute);
      expect(DisplaySettingsLogic.values.dataLoading).toEqual(false);
    });

    it('setServerResponseData', () => {
      DisplaySettingsLogic.actions.setServerResponseData(serverProps);

      expect(DisplaySettingsLogic.values.serverSearchResultConfig).toEqual(
        serverProps.searchResultConfig
      );
      expect(DisplaySettingsLogic.values.searchResultConfig).toEqual(
        serverProps.searchResultConfig
      );

      expect(setSuccessMessage).toHaveBeenCalled();
    });

    it('handles empty color', () => {
      const propsWithoutColor = {
        ...serverProps,
        searchResultConfig: {
          ...serverProps.searchResultConfig,
          color: '',
        },
      };
      const configWithDefaultColor = {
        ...serverProps.searchResultConfig,
        color: '#000000',
      };
      DisplaySettingsLogic.actions.onInitializeDisplaySettings(propsWithoutColor);

      expect(DisplaySettingsLogic.values.serverSearchResultConfig).toEqual(configWithDefaultColor);
      expect(DisplaySettingsLogic.values.searchResultConfig).toEqual(configWithDefaultColor);
    });

    it('setTitleField', () => {
      const TITLE = 'newTitle';
      DisplaySettingsLogic.actions.setServerResponseData(serverProps);
      DisplaySettingsLogic.actions.setTitleField(TITLE);

      expect(DisplaySettingsLogic.values.searchResultConfig).toEqual({
        ...searchResultConfig,
        titleField: TITLE,
      });
    });

    it('setUrlField', () => {
      const URL = 'http://new.url';
      DisplaySettingsLogic.actions.setServerResponseData(serverProps);
      DisplaySettingsLogic.actions.setUrlField(URL);

      expect(DisplaySettingsLogic.values.searchResultConfig).toEqual({
        ...searchResultConfig,
        urlField: URL,
      });
    });

    it('setSubtitleField', () => {
      const SUBTITLE = 'new sub title';
      DisplaySettingsLogic.actions.setServerResponseData(serverProps);
      DisplaySettingsLogic.actions.setSubtitleField(SUBTITLE);

      expect(DisplaySettingsLogic.values.searchResultConfig).toEqual({
        ...searchResultConfig,
        subtitleField: SUBTITLE,
      });
    });

    it('setDescriptionField', () => {
      const DESCRIPTION = 'new description';
      DisplaySettingsLogic.actions.setServerResponseData(serverProps);
      DisplaySettingsLogic.actions.setDescriptionField(DESCRIPTION);

      expect(DisplaySettingsLogic.values.searchResultConfig).toEqual({
        ...searchResultConfig,
        descriptionField: DESCRIPTION,
      });
    });

    it('setColorField', () => {
      const HEX = '#e3e3e3';
      DisplaySettingsLogic.actions.setServerResponseData(serverProps);
      DisplaySettingsLogic.actions.setColorField(HEX);

      expect(DisplaySettingsLogic.values.searchResultConfig).toEqual({
        ...searchResultConfig,
        color: HEX,
      });
    });

    it('setDetailFields', () => {
      const result = {
        destination: {
          index: 0,
        },
        source: {
          index: 1,
        },
      };
      DisplaySettingsLogic.actions.setServerResponseData(serverProps);
      DisplaySettingsLogic.actions.setDetailFields(result as any);

      expect(DisplaySettingsLogic.values.searchResultConfig).toEqual({
        ...searchResultConfig,
        detailFields: [searchResultConfig.detailFields[1], searchResultConfig.detailFields[0]],
      });
    });

    it('removeDetailField', () => {
      DisplaySettingsLogic.actions.setServerResponseData(serverProps);
      DisplaySettingsLogic.actions.removeDetailField(0);

      expect(DisplaySettingsLogic.values.searchResultConfig).toEqual({
        ...searchResultConfig,
        detailFields: [searchResultConfig.detailFields[1]],
      });
    });

    it('addDetailField', () => {
      const newField = { label: 'Monkey', fieldName: 'primate' };
      DisplaySettingsLogic.actions.setServerResponseData(serverProps);
      DisplaySettingsLogic.actions.addDetailField(newField);

      expect(DisplaySettingsLogic.values.searchResultConfig).toEqual({
        ...searchResultConfig,
        detailFields: [
          searchResultConfig.detailFields[0],
          searchResultConfig.detailFields[1],
          newField,
        ],
      });
    });

    it('updateDetailField', () => {
      const updatedField = { label: 'Monkey', fieldName: 'primate' };
      DisplaySettingsLogic.actions.setServerResponseData(serverProps);
      DisplaySettingsLogic.actions.updateDetailField(updatedField, 0);

      expect(DisplaySettingsLogic.values.searchResultConfig).toEqual({
        ...searchResultConfig,
        detailFields: [updatedField, searchResultConfig.detailFields[1]],
      });
    });

    it('openEditDetailField', () => {
      const INDEX = 2;
      DisplaySettingsLogic.actions.openEditDetailField(INDEX);

      expect(DisplaySettingsLogic.values.editFieldIndex).toEqual(INDEX);
    });

    it('toggleFieldEditorModal', () => {
      DisplaySettingsLogic.actions.toggleFieldEditorModal();

      expect(DisplaySettingsLogic.values.editFieldIndex).toEqual(null);
      expect(DisplaySettingsLogic.values.addFieldModalVisible).toEqual(
        !defaultValues.addFieldModalVisible
      );
      expect(clearFlashMessages).toHaveBeenCalled();
    });

    it('toggleTitleFieldHover', () => {
      DisplaySettingsLogic.actions.toggleTitleFieldHover();

      expect(DisplaySettingsLogic.values.titleFieldHover).toEqual(!defaultValues.titleFieldHover);
    });

    it('toggleSubtitleFieldHover', () => {
      DisplaySettingsLogic.actions.toggleSubtitleFieldHover();

      expect(DisplaySettingsLogic.values.subtitleFieldHover).toEqual(
        !defaultValues.subtitleFieldHover
      );
    });

    it('toggleDescriptionFieldHover', () => {
      DisplaySettingsLogic.actions.toggleDescriptionFieldHover();

      expect(DisplaySettingsLogic.values.descriptionFieldHover).toEqual(
        !defaultValues.descriptionFieldHover
      );
    });

    it('toggleUrlFieldHover', () => {
      DisplaySettingsLogic.actions.toggleUrlFieldHover();

      expect(DisplaySettingsLogic.values.urlFieldHover).toEqual(!defaultValues.urlFieldHover);
    });
  });

  describe('listeners', () => {
    describe('initializeDisplaySettings', () => {
      it('calls API and sets values (org)', async () => {
        const onInitializeDisplaySettingsSpy = jest.spyOn(
          DisplaySettingsLogic.actions,
          'onInitializeDisplaySettings'
        );
        http.get.mockReturnValue(Promise.resolve(serverProps));
        DisplaySettingsLogic.actions.initializeDisplaySettings();

        expect(http.get).toHaveBeenCalledWith(
          '/api/workplace_search/org/sources/source123/display_settings/config'
        );
        await nextTick();
        expect(onInitializeDisplaySettingsSpy).toHaveBeenCalledWith({
          ...serverProps,
          isOrganization: true,
        });
      });

      it('calls API and sets values (account)', async () => {
        AppLogic.values.isOrganization = false;

        const onInitializeDisplaySettingsSpy = jest.spyOn(
          DisplaySettingsLogic.actions,
          'onInitializeDisplaySettings'
        );
        http.get.mockReturnValue(Promise.resolve(serverProps));
        DisplaySettingsLogic.actions.initializeDisplaySettings();

        expect(http.get).toHaveBeenCalledWith(
          '/api/workplace_search/account/sources/source123/display_settings/config'
        );
        await nextTick();
        expect(onInitializeDisplaySettingsSpy).toHaveBeenCalledWith({
          ...serverProps,
          isOrganization: false,
        });
      });

      it('handles error', async () => {
        http.get.mockReturnValue(Promise.reject('this is an error'));
        DisplaySettingsLogic.actions.initializeDisplaySettings();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });
    });

    describe('setServerData', () => {
      it('calls API and sets values', async () => {
        const setServerResponseDataSpy = jest.spyOn(
          DisplaySettingsLogic.actions,
          'setServerResponseData'
        );
        http.post.mockReturnValue(Promise.resolve(serverProps));
        DisplaySettingsLogic.actions.onInitializeDisplaySettings(serverProps);
        DisplaySettingsLogic.actions.setServerData();

        expect(http.post).toHaveBeenCalledWith(serverProps.serverRoute, {
          body: JSON.stringify({ ...searchResultConfig }),
        });
        await nextTick();
        expect(setServerResponseDataSpy).toHaveBeenCalledWith({
          ...serverProps,
        });
      });

      it('handles error', async () => {
        http.post.mockReturnValue(Promise.reject('this is an error'));
        DisplaySettingsLogic.actions.setServerData();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });
    });
  });

  describe('selectors', () => {
    describe('availableFieldOptions', () => {
      it('should handle duplicate', () => {
        const propsWithDuplicates = {
          ...serverProps,
          schemaFields: {
            cats: 'string',
            dogs: 'string',
            monkeys: 'string',
          },
          searchResultConfig: {
            ...searchResultConfig,
            detailsFields: [searchResultConfig.detailFields[0], searchResultConfig.detailFields[1]],
          },
        };

        DisplaySettingsLogic.actions.onInitializeDisplaySettings(propsWithDuplicates);

        expect(DisplaySettingsLogic.values.availableFieldOptions).toEqual([
          { text: 'monkeys', value: 'monkeys' },
        ]);
      });
    });
  });
});
