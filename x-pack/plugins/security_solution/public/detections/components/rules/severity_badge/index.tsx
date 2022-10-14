/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { upperFirst } from 'lodash/fp';
import { euiLightVars } from '@kbn/ui-theme';

import type { Severity } from '../../../../../common/detection_engine/rule_schema';
import { HealthTruncateText } from '../../../../common/components/health_truncate_text';

const { euiColorVis0, euiColorVis5, euiColorVis7, euiColorVis9 } = euiLightVars;
const severityToColorMap: Record<Severity, string> = {
  low: euiColorVis0,
  medium: euiColorVis5,
  high: euiColorVis7,
  critical: euiColorVis9,
};

interface Props {
  value: Severity;
}

const SeverityBadgeComponent: React.FC<Props> = ({ value }) => {
  const displayValue = upperFirst(value);
  const color = severityToColorMap[value] ?? 'subdued';

  return (
    <HealthTruncateText healthColor={color} tooltipContent={displayValue} dataTestSubj="severity">
      {displayValue}
    </HealthTruncateText>
  );
};

export const SeverityBadge = React.memo(SeverityBadgeComponent);
