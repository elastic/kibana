/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, formatDate } from '@elastic/eui';
import React from 'react';
import { Annotation, CreateAnnotationParams } from '../../../../common/annotations';

export function TimestampRangeLabel({
  annotation,
}: {
  annotation: Annotation | CreateAnnotationParams;
}) {
  if (annotation.event?.end) {
    return (
      <div>
        {formatDate(annotation['@timestamp'], 'longDateTime')}
        <EuiIcon
          type="sortRight"
          css={{
            margin: '0 5px',
          }}
        />
        {formatDate(annotation.event?.end, 'longDateTime')}
      </div>
    );
  }
  return <>{formatDate(annotation['@timestamp'], 'longDateTime')}</>;
}
