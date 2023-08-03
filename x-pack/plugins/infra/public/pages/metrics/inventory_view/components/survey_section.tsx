/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useWaffleOptionsContext } from '../hooks/use_waffle_options';
import { SurveyInventory } from './survey_inventory';
import { SurveyKubernetes } from './survey_kubernetes';

export const SurveySection = () => {
  const { nodeType } = useWaffleOptionsContext();
  const podNodeType: typeof nodeType = 'pod';

  return <>{nodeType === podNodeType ? <SurveyKubernetes /> : <SurveyInventory />}</>;
};
