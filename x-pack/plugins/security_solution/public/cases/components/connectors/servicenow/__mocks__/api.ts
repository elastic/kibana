/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { choices } from '../../mock';
import { GetChoicesProps } from '../api';
import { Choice } from '../types';

export const choicesResponse = {
  status: 'ok',
  data: choices,
};

export const getChoices = async (
  props: GetChoicesProps
): Promise<{ status: string; data: Choice[] }> => Promise.resolve(choicesResponse);
