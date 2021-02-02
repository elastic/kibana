/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, isEqual, differenceBy } from 'lodash';
import { DropResult } from 'react-beautiful-dnd';

import { kea, MakeLogicType } from 'kea';

import { HttpLogic } from '../../../../../shared/http';

import {
  setSuccessMessage,
  clearFlashMessages,
  flashAPIErrors,
} from '../../../../../shared/flash_messages';

import { AppLogic } from '../../../../app_logic';
import { SourceLogic } from '../../source_logic';

import { DetailField, SearchResultConfig, OptionValue, Result } from '../../../../types';
import { LEAVE_UNASSIGNED_FIELD, SUCCESS_MESSAGE } from './constants';
export interface DisplaySettingsResponseProps {
  sourceName: string;
  searchResultConfig: SearchResultConfig;
  schemaFields: object;
  exampleDocuments: Result[];
}

export interface DisplaySettingsInitialData extends DisplaySettingsResponseProps {
  sourceId: string;
  serverRoute: string;
}

interface DisplaySettingsActions {
  initializeDisplaySettings(): void;
  setServerData(): void;
  onInitializeDisplaySettings(
    displaySettingsProps: DisplaySettingsInitialData
  ): DisplaySettingsInitialData;
  setServerResponseData(
    displaySettingsProps: DisplaySettingsResponseProps
  ): DisplaySettingsResponseProps;
  setTitleField(titleField: string | null): string | null;
  setUrlField(urlField: string): string;
  setSubtitleField(subtitleField: string | null): string | null;
  setDescriptionField(descriptionField: string | null): string | null;
  setColorField(hex: string): string;
  setDetailFields(result: DropResult): { result: DropResult };
  openEditDetailField(editFieldIndex: number | null): number | null;
  removeDetailField(index: number): number;
  addDetailField(newField: DetailField): DetailField;
  updateDetailField(
    updatedField: DetailField,
    index: number | null
  ): { updatedField: DetailField; index: number };
  toggleFieldEditorModal(): void;
  toggleTitleFieldHover(): void;
  toggleSubtitleFieldHover(): void;
  toggleDescriptionFieldHover(): void;
  toggleUrlFieldHover(): void;
}

interface DisplaySettingsValues {
  sourceName: string;
  sourceId: string;
  schemaFields: object;
  exampleDocuments: Result[];
  serverSearchResultConfig: SearchResultConfig;
  searchResultConfig: SearchResultConfig;
  serverRoute: string;
  editFieldIndex: number | null;
  dataLoading: boolean;
  addFieldModalVisible: boolean;
  titleFieldHover: boolean;
  urlFieldHover: boolean;
  subtitleFieldHover: boolean;
  descriptionFieldHover: boolean;
  fieldOptions: OptionValue[];
  optionalFieldOptions: OptionValue[];
  availableFieldOptions: OptionValue[];
  unsavedChanges: boolean;
}

export const defaultSearchResultConfig = {
  titleField: '',
  subtitleField: '',
  descriptionField: '',
  urlField: '',
  color: '#000000',
  detailFields: [],
};

export const DisplaySettingsLogic = kea<
  MakeLogicType<DisplaySettingsValues, DisplaySettingsActions>
>({
  actions: {
    onInitializeDisplaySettings: (displaySettingsProps: DisplaySettingsInitialData) =>
      displaySettingsProps,
    setServerResponseData: (displaySettingsProps: DisplaySettingsResponseProps) =>
      displaySettingsProps,
    setTitleField: (titleField: string) => titleField,
    setUrlField: (urlField: string) => urlField,
    setSubtitleField: (subtitleField: string | null) => subtitleField,
    setDescriptionField: (descriptionField: string) => descriptionField,
    setColorField: (hex: string) => hex,
    setDetailFields: (result: DropResult) => ({ result }),
    openEditDetailField: (editFieldIndex: number | null) => editFieldIndex,
    removeDetailField: (index: number) => index,
    addDetailField: (newField: DetailField) => newField,
    updateDetailField: (updatedField: DetailField, index: number) => ({ updatedField, index }),
    toggleFieldEditorModal: () => true,
    toggleTitleFieldHover: () => true,
    toggleSubtitleFieldHover: () => true,
    toggleDescriptionFieldHover: () => true,
    toggleUrlFieldHover: () => true,
    initializeDisplaySettings: () => true,
    setServerData: () => true,
  },
  reducers: {
    sourceName: [
      '',
      {
        onInitializeDisplaySettings: (_, { sourceName }) => sourceName,
      },
    ],
    sourceId: [
      '',
      {
        onInitializeDisplaySettings: (_, { sourceId }) => sourceId,
      },
    ],
    schemaFields: [
      {},
      {
        onInitializeDisplaySettings: (_, { schemaFields }) => schemaFields,
      },
    ],
    exampleDocuments: [
      [],
      {
        onInitializeDisplaySettings: (_, { exampleDocuments }) => exampleDocuments,
      },
    ],
    serverSearchResultConfig: [
      defaultSearchResultConfig,
      {
        onInitializeDisplaySettings: (_, { searchResultConfig }) =>
          setDefaultColor(searchResultConfig),
        setServerResponseData: (_, { searchResultConfig }) => searchResultConfig,
      },
    ],
    searchResultConfig: [
      defaultSearchResultConfig,
      {
        onInitializeDisplaySettings: (_, { searchResultConfig }) =>
          setDefaultColor(searchResultConfig),
        setServerResponseData: (_, { searchResultConfig }) => searchResultConfig,
        setTitleField: (searchResultConfig, titleField) => ({ ...searchResultConfig, titleField }),
        setSubtitleField: (searchResultConfig, subtitleField) => ({
          ...searchResultConfig,
          subtitleField,
        }),
        setUrlField: (searchResultConfig, urlField) => ({ ...searchResultConfig, urlField }),
        setDescriptionField: (searchResultConfig, descriptionField) => ({
          ...searchResultConfig,
          descriptionField,
        }),
        setColorField: (searchResultConfig, color) => ({ ...searchResultConfig, color }),
        setDetailFields: (searchResultConfig, { result: { destination, source } }) => {
          const detailFields = cloneDeep(searchResultConfig.detailFields);
          const element = detailFields[source.index];
          detailFields.splice(source.index, 1);
          detailFields.splice(destination!.index, 0, element);
          return {
            ...searchResultConfig,
            detailFields,
          };
        },
        addDetailField: (searchResultConfig, newfield) => {
          const detailFields = cloneDeep(searchResultConfig.detailFields);
          detailFields.push(newfield);
          return {
            ...searchResultConfig,
            detailFields,
          };
        },
        removeDetailField: (searchResultConfig, index) => {
          const detailFields = cloneDeep(searchResultConfig.detailFields);
          detailFields.splice(index, 1);
          return {
            ...searchResultConfig,
            detailFields,
          };
        },
        updateDetailField: (searchResultConfig, { updatedField, index }) => {
          const detailFields = cloneDeep(searchResultConfig.detailFields);
          detailFields[index] = updatedField;
          return {
            ...searchResultConfig,
            detailFields,
          };
        },
      },
    ],
    serverRoute: [
      '',
      {
        onInitializeDisplaySettings: (_, { serverRoute }) => serverRoute,
      },
    ],
    editFieldIndex: [
      null,
      {
        openEditDetailField: (_, openEditDetailField) => openEditDetailField,
        toggleFieldEditorModal: () => null,
      },
    ],
    dataLoading: [
      true,
      {
        onInitializeDisplaySettings: () => false,
      },
    ],
    addFieldModalVisible: [
      false,
      {
        toggleFieldEditorModal: (addFieldModalVisible) => !addFieldModalVisible,
        openEditDetailField: () => true,
        updateDetailField: () => false,
        addDetailField: () => false,
      },
    ],
    titleFieldHover: [
      false,
      {
        toggleTitleFieldHover: (titleFieldHover) => !titleFieldHover,
      },
    ],
    urlFieldHover: [
      false,
      {
        toggleUrlFieldHover: (urlFieldHover) => !urlFieldHover,
      },
    ],
    subtitleFieldHover: [
      false,
      {
        toggleSubtitleFieldHover: (subtitleFieldHover) => !subtitleFieldHover,
      },
    ],
    descriptionFieldHover: [
      false,
      {
        toggleDescriptionFieldHover: (addFieldModalVisible) => !addFieldModalVisible,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    fieldOptions: [
      () => [selectors.schemaFields],
      (schemaFields) => Object.keys(schemaFields).map(euiSelectObjectFromValue),
    ],
    optionalFieldOptions: [
      () => [selectors.fieldOptions],
      (fieldOptions) => {
        const optionalFieldOptions = cloneDeep(fieldOptions);
        optionalFieldOptions.unshift({
          value: LEAVE_UNASSIGNED_FIELD,
          text: LEAVE_UNASSIGNED_FIELD,
        });
        return optionalFieldOptions;
      },
    ],
    // We don't want to let the user add a duplicate detailField.
    availableFieldOptions: [
      () => [selectors.fieldOptions, selectors.searchResultConfig],
      (fieldOptions, { detailFields }) => {
        const usedFields = detailFields.map((usedField: DetailField) =>
          euiSelectObjectFromValue(usedField.fieldName)
        );
        return differenceBy(fieldOptions, usedFields, 'value');
      },
    ],
    unsavedChanges: [
      () => [selectors.searchResultConfig, selectors.serverSearchResultConfig],
      (uiConfig, serverConfig) => !isEqual(uiConfig, serverConfig),
    ],
  }),
  listeners: ({ actions, values }) => ({
    initializeDisplaySettings: async () => {
      const { isOrganization } = AppLogic.values;
      const {
        contentSource: { id: sourceId },
      } = SourceLogic.values;

      const route = isOrganization
        ? `/api/workplace_search/org/sources/${sourceId}/display_settings/config`
        : `/api/workplace_search/account/sources/${sourceId}/display_settings/config`;

      try {
        const response = await HttpLogic.values.http.get(route);
        actions.onInitializeDisplaySettings({
          isOrganization,
          sourceId,
          serverRoute: route,
          ...response,
        });
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    setServerData: async () => {
      const { searchResultConfig, serverRoute } = values;

      try {
        const response = await HttpLogic.values.http.post(serverRoute, {
          body: JSON.stringify({ ...searchResultConfig }),
        });
        actions.setServerResponseData(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    setServerResponseData: () => {
      setSuccessMessage(SUCCESS_MESSAGE);
    },
    toggleFieldEditorModal: () => {
      clearFlashMessages();
    },
  }),
});

const euiSelectObjectFromValue = (value: string) => ({ text: value, value });

// By default, the color is `null` on the server. The color is a required field and the
// EuiColorPicker components doesn't allow the field to be required so the form can be
// submitted with no color and this results in a server error. The default should be black
// and this allows the `searchResultConfig` and the `serverSearchResultConfig` reducers to
// stay synced on initialization.
const setDefaultColor = (searchResultConfig: SearchResultConfig) => ({
  ...searchResultConfig,
  color: searchResultConfig.color || '#000000',
});
