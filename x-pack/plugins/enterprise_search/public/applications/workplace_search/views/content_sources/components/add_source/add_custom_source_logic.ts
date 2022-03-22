/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors, clearFlashMessages } from '../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../shared/http';
import { AppLogic } from '../../../../app_logic';
import { CustomSource, SourceDataItem } from '../../../../types';

export interface AddCustomSourceProps {
  sourceData: SourceDataItem;
  initialValue: string;
}

export enum AddCustomSourceSteps {
  ConfigureCustomStep = 'Configure Custom',
  SaveCustomStep = 'Save Custom',
}

export interface AddCustomSourceActions {
  createContentSource(): void;
  setButtonNotLoading(): void;
  setCustomSourceNameValue(customSourceNameValue: string): string;
  setNewCustomSource(data: CustomSource): CustomSource;
}

interface AddCustomSourceValues {
  buttonLoading: boolean;
  currentStep: AddCustomSourceSteps;
  customSourceNameValue: string;
  newCustomSource: CustomSource;
  sourceData: SourceDataItem;
}

/**
 * Workplace Search needs to know the host for the redirect. As of yet, we do not
 * have access to this in Kibana. We parse it from the browser and pass it as a param.
 */

export const AddCustomSourceLogic = kea<
  MakeLogicType<AddCustomSourceValues, AddCustomSourceActions, AddCustomSourceProps>
>({
  path: ['enterprise_search', 'workplace_search', 'add_custom_source_logic'],
  actions: {
    createContentSource: true,
    setButtonNotLoading: true,
    setCustomSourceNameValue: (customSourceNameValue) => customSourceNameValue,
    setNewCustomSource: (data) => data,
  },
  reducers: ({ props }) => ({
    buttonLoading: [
      false,
      {
        setButtonNotLoading: () => false,
        createContentSource: () => true,
      },
    ],
    currentStep: [
      AddCustomSourceSteps.ConfigureCustomStep,
      {
        setNewCustomSource: () => AddCustomSourceSteps.SaveCustomStep,
      },
    ],
    customSourceNameValue: [
      props.initialValue,
      {
        setCustomSourceNameValue: (_, customSourceNameValue) => customSourceNameValue,
      },
    ],
    newCustomSource: [
      {} as CustomSource,
      {
        setNewCustomSource: (_, newCustomSource) => newCustomSource,
      },
    ],
    sourceData: [props.sourceData],
  }),
  listeners: ({ actions, values, props }) => ({
    createContentSource: async () => {
      clearFlashMessages();
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? '/internal/workplace_search/org/create_source'
        : '/internal/workplace_search/account/create_source';

      const { customSourceNameValue } = values;

      const baseParams = {
        service_type: 'custom',
        name: customSourceNameValue,
      };

      // pre-configured custom sources have a serviceType reflecting their target service
      // we submit this as `base_service_type` to keep track of
      const params =
        props.sourceData.serviceType === 'custom'
          ? baseParams
          : {
              ...baseParams,
              base_service_type: props.sourceData.serviceType,
            };

      try {
        const response = await HttpLogic.values.http.post<CustomSource>(route, {
          body: JSON.stringify(params),
        });
        actions.setNewCustomSource(response);
      } catch (e) {
        flashAPIErrors(e);
      } finally {
        actions.setButtonNotLoading();
      }
    },
  }),
});
