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
        // @ts-expect-error upgrade typescript v5.1.6
        setAdditionalFeedback: (_, { additionalFeedback }) => additionalFeedback ?? undefined,
      },
    ],
    feature: [
      '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setFeature: (_, { feature }) => feature,
      },
    ],
    featuresOther: [
      null,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setFeaturesOther: (_, { featuresOther }) => featuresOther,
      },
    ],
    participateInUXLabs: [
      null,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setParticipateInUXLabs: (_, { participateInUXLabs }) => participateInUXLabs,
      },
    ],
  }),
});
