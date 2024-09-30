/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import {
  AppSearchGatedFormDataApiLogicActions,
  UpdateAppSearchGatedFormDataApiLogic,
} from './app_search_gate_api_logic';

interface AppSearchGateValues {
  additionalFeedback: string | null;
  feature: string;
  featuresOther: string | null;
  participateInUXLabs: boolean | null;
}

interface AppSearchGateActions {
  formSubmitRequest: () => void;
  setAdditionalFeedback(additionalFeedback: string): { additionalFeedback: string };
  setFeature(feature: string): { feature: string };
  setFeaturesOther(featuresOther: string): { featuresOther: string };
  setParticipateInUXLabs(participateInUXLabs: boolean): {
    participateInUXLabs: boolean;
  };
  submitGatedFormDataRequest: AppSearchGatedFormDataApiLogicActions['makeRequest'];
}

export const AppSearchGateLogic = kea<MakeLogicType<AppSearchGateValues, AppSearchGateActions>>({
  actions: {
    formSubmitRequest: true,
    setAdditionalFeedback: (additionalFeedback) => ({ additionalFeedback }),
    setFeature: (feature) => ({ feature }),
    setFeaturesOther: (featuresOther) => ({ featuresOther }),
    setParticipateInUXLabs: (participateInUXLabs) => ({ participateInUXLabs }),
  },
  connect: {
    actions: [UpdateAppSearchGatedFormDataApiLogic, ['makeRequest as submitGatedFormDataRequest']],
  },
  listeners: ({ actions, values }) => ({
    formSubmitRequest: () => {
      if (values.feature) {
        actions.submitGatedFormDataRequest({
          additionalFeedback: values?.additionalFeedback ? values?.additionalFeedback : null,
          feature: values.feature,
          featuresOther: values?.featuresOther ? values?.featuresOther : null,
          participateInUXLabs: values?.participateInUXLabs,
        });
      }
    },
  }),
  path: ['enterprise_search', 'app_search', 'gate_form'],

  reducers: ({}) => ({
    additionalFeedback: [
      null,
      {
        setAdditionalFeedback: (
          _: AppSearchGateValues['additionalFeedback'],
          { additionalFeedback }: { additionalFeedback: AppSearchGateValues['additionalFeedback'] }
        ): AppSearchGateValues['additionalFeedback'] => additionalFeedback ?? null,
      },
    ],
    feature: [
      '',
      {
        setFeature: (
          _: AppSearchGateValues['feature'],
          { feature }: { feature: AppSearchGateValues['feature'] }
        ): AppSearchGateValues['feature'] => feature ?? '',
      },
    ],
    featuresOther: [
      null,
      {
        setFeaturesOther: (
          _: AppSearchGateValues['featuresOther'],
          { featuresOther }: { featuresOther: AppSearchGateValues['featuresOther'] }
        ): AppSearchGateValues['featuresOther'] => featuresOther ?? null,
      },
    ],
    participateInUXLabs: [
      null,
      {
        setParticipateInUXLabs: (
          _: AppSearchGateValues['participateInUXLabs'],
          {
            participateInUXLabs,
          }: { participateInUXLabs: AppSearchGateValues['participateInUXLabs'] }
        ): AppSearchGateValues['participateInUXLabs'] => participateInUXLabs ?? null,
      },
    ],
  }),
});
