/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AnnotationDomainType, LineAnnotation } from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { useWaterfallContext } from '..';
import { useTheme } from '../../../../../../../observability/public';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';

export function WaterfallCharMarkers() {
  const { markerItems } = useWaterfallContext();

  const theme = useTheme();

  if (!markerItems) {
    return null;
  }

  const markersInfo: Record<string, { label: string; color: string }> = {
    domContentLoaded: { label: 'DOMContentLoaded', color: theme.eui.euiColorVis0 },
    firstContentfulPaint: { label: 'First contentful paint', color: theme.eui.euiColorVis1 },
    largestContentfulPaint: { label: 'Largest contentful paint', color: theme.eui.euiColorVis2 },
    layoutShift: { label: 'Layout shit', color: theme.eui.euiColorVis3 },
    loadEvent: { label: 'Load event', color: theme.eui.euiColorVis9 },
  };

  return (
    <Wrapper>
      {markerItems.map(({ id, offset }) => (
        <LineAnnotation
          id={id}
          domainType={AnnotationDomainType.YDomain}
          dataValues={[
            {
              dataValue: offset,
              details: markersInfo[id].label,
              header: offset + ' ms',
            },
          ]}
          marker={<EuiIcon type="dot" size="l" />}
          style={{
            line: {
              strokeWidth: 2,
              stroke: markersInfo[id].color,
              opacity: 1,
            },
          }}
        />
      ))}
    </Wrapper>
  );
}

const Wrapper = euiStyled.span`
  &&& {
    > .echAnnotation__icon {
      top: 8px;
    }
  }
`;
