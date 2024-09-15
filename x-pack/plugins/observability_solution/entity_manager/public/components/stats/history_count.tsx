/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { DefinitionStatProps } from './types';

export function HistoryCountStat({ definition, titleSize, textAlign }: DefinitionStatProps) {
  return (
    <EuiStat
      titleSize={titleSize}
      title={numeral(definition.stats.totalDocs || 0).format(
        definition.stats.totalDocs > 1000 ? '0.0a' : '0'
      )}
      textAlign={textAlign}
      description={i18n.translate('xpack.entityManager.listing.historyCount.label', {
        defaultMessage: 'History count',
      })}
    />
  );
}
