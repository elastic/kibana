/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty } from 'lodash';
import styled from 'styled-components';

import { INDICATOR_DESTINATION_PATH } from '../../../../../../../common/constants';
import { INDICATOR_MATCH_SUBFIELDS } from '../../../../../../../common/cti/constants';
import { Ecs } from '../../../../../../../common/ecs';
import { ThreatIndicatorEcs } from '../../../../../../../common/ecs/threat';

const getIndicatorEcs = (data: Ecs): ThreatIndicatorEcs[] => {
  const threatData = get(data, INDICATOR_DESTINATION_PATH);
  if (threatData == null) {
    return [];
  } else if (!Array.isArray(threatData)) {
    return [threatData];
  }
  return threatData;
};

export const hasThreatMatchValue = (data: Ecs): boolean =>
  getIndicatorEcs(data).some((indicator) =>
    INDICATOR_MATCH_SUBFIELDS.some(
      (indicatorMatchSubField) => !isEmpty(get(indicator, indicatorMatchSubField))
    )
  );

export const HorizontalSpacer = styled.div`
  margin: 0 ${({ theme }) => theme.eui.paddingSizes.xs};
`;
