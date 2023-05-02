/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPopoverTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  sourceDescriptor: Partial<ESDistanceSourceDescriptor>;
  onSourceDescriptorChange: (sourceDescriptor: Partial<JoinSourceDescriptor>) => void;
}

export function SpatialJoinPopoverContent(props: Props) {
  return (
    <div style={{ width: 300 }}>
      <EuiPopoverTitle>
        {i18n.translate('xpack.maps.spatialJoinExpression.popoverTitle', {
          defaultMessage: 'Configure spatial join',
        })}
      </EuiPopoverTitle>
    </div>
  );
}