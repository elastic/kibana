/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { HomeEmptyPrompt } from './empty_prompt';
import { getDisableStoryshotsParameter } from '../../../../storybook';

export default {
  title: 'Home/Empty Prompt',
  argTypes: {},
  parameters: { ...getDisableStoryshotsParameter() },
};

export const EmptyPrompt = () => <HomeEmptyPrompt />;
