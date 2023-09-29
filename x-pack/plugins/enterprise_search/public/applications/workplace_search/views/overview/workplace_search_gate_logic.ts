/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import {
  GatedFormDataApiLogicActions,
  UpdateGatedFormDataApiLogic,
} from './send_gatedForm_data_api_logic';

// import {
//   GatedFormDataApiLogicActions,
//   sendGatedFormData,
//   UpdateGatedFormDataApiLogic,
//   UpdateSearchApplicationApiLogic,
// } from './send_gatedForm_data_api_logic';

interface WorkplaceSearchGateValues {
  additionalFeedback?: string;
  feature: string;
  featuresOther?: string;
  isFormSubmitted: boolean;
  participateInUXLabs?: string;
}
interface WorkplaceSearchGateActions {
  setAdditionalFeedback(additionalFeedback: string): { additionalFeedback: string };
  setFeature(feature: string): { feature: string };
  setFeaturesOther(featuresOther: string): { featuresOther: string };
  setFormSubmitted: () => void;
  formDataUpdated: () => void;
  submitGatedFormDataRequest: GatedFormDataApiLogicActions['makeRequest'];
  setParticipateInUXLabs(participateInUXLabs: string): { participateInUXLabs: boolean };
}
export const WorkplaceSearchGateLogic = kea<
  MakeLogicType<WorkplaceSearchGateValues, WorkplaceSearchGateActions>
>({
  actions: {
    setAdditionalFeedback: (additionalFeedback) => ({ additionalFeedback }),
    setFeature: (feature) => ({ feature }),
    setFeaturesOther: (featuresOther) => ({ featuresOther }),
    setFormSubmitted: true,
    setParticipateInUXLabs: (participateInUXLabs) => ({ participateInUXLabs }),
  },
  connect: {
    actions: [
      UpdateGatedFormDataApiLogic,
      ['makeRequest as submitGatedFormDataRequest', 'apiSuccess as formDataUpdated'],
    ],
  },
  path: ['enterprise_search', 'workplace_search', 'gate_form'],
  reducers: {
    additionalFeedback: [
      '',
      {
        setAdditionalFeedback: (_, { additionalFeedback }) => additionalFeedback,
      },
    ],
    feature: [
      '',
      {
        setFeature: (_, { feature }) => feature,
      },
    ],
    featuresOther: [
      '',
      {
        setFeaturesOther: (_, { featuresOther }) => featuresOther,
      },
    ],
    isFormSubmitted: [
      false,
      {
        formDataUpdated: () => true,
      },
    ],
    participateInUXLabs: [
      '',
      {
        setParticipateInUXLabs: (_, { participateInUXLabs }) => participateInUXLabs,
      },
    ],
  },
  listeners: ({ actions, values }) => ({
    setFormSubmitted: () => {
      const resp = actions.submitGatedFormDataRequest({
        additionalFeedback: values.additionalFeedback,
        feature: values.feature,
        featuresOther: values.featuresOther,
        participateInUXLabs: false,
      });

      console.log('resp', resp);
    },
    formDataUpdated: () => {
      console.log('Done');
    },
  }),
});
