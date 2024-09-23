/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { EuiStat } from '@elastic/eui';
import { DefinitionStatProps } from './types';

export function LatestCheckpointDurationStat({
  definition,
  textAlign,
  titleSize,
}: DefinitionStatProps) {
  return (
    <EuiStat
      titleSize={titleSize}
      title={`${
        numeral(definition.state.avgCheckpointDuration.latest).format('0,0') + 'ms' || 'N/A'
      }`}
      textAlign={textAlign}
      description={i18n.translate(
        'xpack.entityManager.definitionStat.latestCheckpointDuration.label',
        {
          defaultMessage: 'Latest Checkpoint Duration',
        }
      )}
    />
  );
}
