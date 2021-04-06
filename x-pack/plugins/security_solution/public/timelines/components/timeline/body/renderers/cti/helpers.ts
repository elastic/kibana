/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty } from 'lodash';

import { INDICATOR_DESTINATION_PATH } from '../../../../../../../common/constants';
import { Ecs } from '../../../../../../../common/ecs';
import { ThreatIndicatorEcs } from '../../../../../../../common/ecs/threat';
import { threatMatchSubFields } from './constants';

export const getIndicatorEcs = (data: Ecs): ThreatIndicatorEcs[] =>
  get(data, INDICATOR_DESTINATION_PATH) ?? [];

export const hasThreatMatchValue = (data: Ecs): boolean =>
  getIndicatorEcs(data).some((indicator) =>
    threatMatchSubFields.some(
      (threatMatchSubField) => !isEmpty(get(indicator, threatMatchSubField))
    )
  );
