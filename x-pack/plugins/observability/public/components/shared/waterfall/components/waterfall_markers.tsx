/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AnnotationDomainType, LineAnnotation, LineAnnotationDatum } from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { useWaterfallContext } from '..';

function generateAnnotationData(markersItems: any[]): LineAnnotationDatum[] {
  return markersItems.map(({ offset, id }, index) => ({
    dataValue: offset / 1000,
    details: id,
  }));
}

export function WaterfallCharMarkers({ showMark = true }: { showMark?: boolean }) {
  const { markersItems } = useWaterfallContext();
  const dataValues = generateAnnotationData(markersItems);
  return (
    <LineAnnotation
      id="annotation_1"
      domainType={AnnotationDomainType.YDomain}
      dataValues={dataValues}
      marker={showMark ? <EuiIcon type="dot" size="l" /> : null}
    />
  );
}
