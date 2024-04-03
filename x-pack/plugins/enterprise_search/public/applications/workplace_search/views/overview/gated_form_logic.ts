/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { GatedFormDataApiLogicActions, UpdateGatedFormDataApiLogic } from './gated_form_api_logic';

interface WorkplaceSearchGateValues {
  additionalFeedback: string | null;
  feature: string;
  featuresOther: string | null;
  participateInUXLabs: boolean | null;
}
interface WorkplaceSearchGateActions {
  formSubmitRequest: () => void;
  setAdditionalFeedback(additionalFeedback: string): { additionalFeedback: string };
  setFeature(feature: string): { feature: string };
  setFeaturesOther(featuresOther: string): { featuresOther: string };
  setParticipateInUXLabs(participateInUXLabs: boolean): {
    participateInUXLabs: boolean;
  };
  submitGatedFormDataRequest: GatedFormDataApiLogicActions['makeRequest'];
}
export const WorkplaceSearchGateLogic = kea<
  MakeLogicType<WorkplaceSearchGateValues, WorkplaceSearchGateActions>
>({
  actions: {
    formSubmitRequest: true,
    setAdditionalFeedback: (additionalFeedback) => ({ additionalFeedback }),
    setFeature: (feature) => ({ feature }),
    setFeaturesOther: (featuresOther) => ({ featuresOther }),
    setParticipateInUXLabs: (participateInUXLabs) => ({ participateInUXLabs }),
  },
  connect: {
    actions: [UpdateGatedFormDataApiLogic, ['makeRequest as submitGatedFormDataRequest']],
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
  path: ['enterprise_search', 'workplace_search', 'gate_form'],

  reducers: ({}) => ({
    additionalFeedback: [
      null,
      {
        setAdditionalFeedback: (_, { additionalFeedback }) => additionalFeedback ?? undefined,
      },
    ],
    feature: [
      '',
      {
        setFeature: (_, { feature }) => feature,
      },
    ],
    featuresOther: [
      null,
      {
        setFeaturesOther: (_, { featuresOther }) => featuresOther,
      },
    ],
    participateInUXLabs: [
      null,
      {
        setParticipateInUXLabs: (_, { participateInUXLabs }) => participateInUXLabs,
      },
    ],
  }),
});
