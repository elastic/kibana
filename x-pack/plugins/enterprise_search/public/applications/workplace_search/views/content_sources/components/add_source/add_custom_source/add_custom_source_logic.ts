/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../../../../common/types/api';
import { CustomSource } from '../../../../../types';

import { AddCustomSourceApiLogic } from './add_custom_source_api_logic';

export interface AddCustomSourceProps {
  baseServiceType?: string;
  initialValue?: string;
}

export enum AddCustomSourceSteps {
  ConfigureCustomStep = 'Configure Custom',
  SaveCustomStep = 'Save Custom',
}

export interface AddCustomSourceActions {
  initiateCall: typeof AddCustomSourceApiLogic.actions.initiateCall;
  apiSuccess({ source }: { source: CustomSource }): { source: CustomSource };
  createContentSource(): void;
  setCustomSourceNameValue(customSourceNameValue: string): string;
  setNewCustomSource(data: CustomSource): CustomSource;
}

interface AddCustomSourceValues {
  buttonLoading: boolean;
  currentStep: AddCustomSourceSteps;
  customSourceNameValue: string;
  newCustomSource: CustomSource;
  status: Status;
}

/**
 * Workplace Search needs to know the host for the redirect. As of yet, we do not
 * have access to this in Kibana. We parse it from the browser and pass it as a param.
 */

export const AddCustomSourceLogic = kea<
  MakeLogicType<AddCustomSourceValues, AddCustomSourceActions, AddCustomSourceProps>
>({
  connect: {
    actions: [AddCustomSourceApiLogic, ['initiateCall', 'apiSuccess']],
    values: [AddCustomSourceApiLogic, ['status']],
  },
  path: ['enterprise_search', 'workplace_search', 'add_custom_source_logic'],
  actions: {
    createContentSource: true,
    setCustomSourceNameValue: (customSourceNameValue) => customSourceNameValue,
    setNewCustomSource: (data) => data,
  },
  reducers: ({ props }) => ({
    buttonLoading: [
      false,
      {
        createContentSource: () => true,
        addSourceSuccess: () => false,
        addSourceError: () => false,
      },
    ],
    currentStep: [
      AddCustomSourceSteps.ConfigureCustomStep,
      {
        setNewCustomSource: () => AddCustomSourceSteps.SaveCustomStep,
      },
    ],
    customSourceNameValue: [
      props.initialValue || '',
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
  }),
  listeners: ({ actions, values, props }) => ({
    createContentSource: () => {
      const { customSourceNameValue } = values;
      const { baseServiceType } = props;
      actions.initiateCall({ name: customSourceNameValue, baseServiceType });
    },
    apiSuccess: ({ source }) => {
      actions.setNewCustomSource(source);
    },
  }),
  selectors: {
    buttonLoading: [(selectors) => [selectors.status], (status) => status === 'PENDING'],
  },
});
