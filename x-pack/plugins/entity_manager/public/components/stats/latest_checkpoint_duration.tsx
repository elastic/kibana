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
import { generateLatestTransformId } from '../../../common/helpers/generate_component_id';

export function LatestCheckpointDurationStat({
  definition,
  textAlign,
  titleSize,
}: DefinitionStatProps) {
  const transformState = definition.resources.transforms.find(
    (doc) => doc.id === generateLatestTransformId(definition)
  );
  const value =
    transformState != null
      ? numeral(transformState.stats.stats.exponential_avg_checkpoint_duration_ms).format('0,0') +
        'ms'
      : 'N/A';
  return (
    <EuiStat
      titleSize={titleSize}
      title={value}
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
