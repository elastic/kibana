/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DefinitionStatProps } from './types';

export function LastSeenStat({ definition, titleSize, textAlign }: DefinitionStatProps) {
  return (
    <EuiStat
      titleSize={titleSize}
      title={moment(definition.stats.lastSeenTimestamp).fromNow()}
      textAlign={textAlign}
      description={i18n.translate('xpack.entityManager.listing.lastSeen.label', {
        defaultMessage: 'Last seen',
      })}
    />
  );
}
