/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

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
  setFormSubmitted(): void;
  setParticipateInUXLabs(participateInUXLabs: string): { participateInUXLabs: boolean };
}
export const WorkplaceSearchGateLogic = kea<
  MakeLogicType<WorkplaceSearchGateValues, WorkplaceSearchGateActions>
>({
  actions: {
    setAdditionalFeedback: (additionalFeedback) => ({ additionalFeedback }),
    setFeature: (feature) => ({ feature }),
    setFeaturesOther: (featuresOther) => ({ featuresOther }),
    setFormSubmitted: () => null,
    setParticipateInUXLabs: (participateInUXLabs) => ({ participateInUXLabs }),
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
        setFormSubmitted: () => true,
      },
    ],
    participateInUXLabs: [
      '',
      {
        setParticipateInUXLabs: (_, { participateInUXLabs }) => participateInUXLabs,
      },
    ],
  },
});
