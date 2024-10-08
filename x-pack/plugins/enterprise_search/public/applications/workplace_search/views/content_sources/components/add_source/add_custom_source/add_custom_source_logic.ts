/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { HttpError, Status } from '../../../../../../../../common/types/api';
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
  makeRequest: typeof AddCustomSourceApiLogic.actions.makeRequest;
  apiSuccess({ source }: { source: CustomSource }): { source: CustomSource };
  apiError(error: HttpError): HttpError;
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
    actions: [AddCustomSourceApiLogic, ['makeRequest', 'apiError', 'apiSuccess']],
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
        apiSuccess: () => false,
        apiError: () => false,
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
        // @ts-expect-error upgrade typescript v5.1.6
        setCustomSourceNameValue: (_, customSourceNameValue) => customSourceNameValue,
      },
    ],
    newCustomSource: [
      {} as CustomSource,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setNewCustomSource: (_, newCustomSource) => newCustomSource,
      },
    ],
  }),
  listeners: ({ actions, values, props }) => ({
    createContentSource: () => {
      const { customSourceNameValue } = values;
      const { baseServiceType } = props;
      actions.makeRequest({ name: customSourceNameValue, baseServiceType });
    },
    apiSuccess: ({ source }) => {
      actions.setNewCustomSource(source);
    },
  }),
  selectors: {
    buttonLoading: [(selectors) => [selectors.status], (status) => status === Status.LOADING],
  },
});
