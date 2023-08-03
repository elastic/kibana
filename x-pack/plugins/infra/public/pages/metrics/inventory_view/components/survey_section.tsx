/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FeatureFeedbackButton } from '../../../../components/feature_feedback_button';

import { useWaffleOptionsContext } from '../hooks/use_waffle_options';
import { SurveyKubernetes } from './survey_kubernetes';

const INVENTORY_FEEDBACK_LINK = 'https://ela.st/survey-infra-inventory?usp=pp_url';

export const SurveySection = () => {
  const { nodeType } = useWaffleOptionsContext();

  return (
    <>
      {nodeType === 'pod' ? (
        <SurveyKubernetes />
      ) : (
        <FeatureFeedbackButton
          data-test-subj="infraInventoryFeedbackLink"
          formUrl={INVENTORY_FEEDBACK_LINK}
        />
      )}
    </>
  );
};
