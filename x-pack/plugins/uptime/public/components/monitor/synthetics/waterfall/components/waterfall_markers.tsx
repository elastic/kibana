/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AnnotationDomainType, LineAnnotation } from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useWaterfallContext } from '..';
import { useTheme } from '../../../../../../../observability/public';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';

export const FCP_LABEL = i18n.translate('xpack.uptime.synthetics.waterfall.fcpLabel', {
  defaultMessage: 'First contentful paint',
});

export const LCP_LABEL = i18n.translate('xpack.uptime.synthetics.waterfall.lcpLabel', {
  defaultMessage: 'Largest contentful paint',
});

export const LAYOUT_SHIFT_LABEL = i18n.translate(
  'xpack.uptime.synthetics.waterfall.layoutShiftLabel',
  {
    defaultMessage: 'Layout shift',
  }
);

export const LOAD_EVENT_LABEL = i18n.translate('xpack.uptime.synthetics.waterfall.loadEventLabel', {
  defaultMessage: 'Load event',
});

export const DOCUMENT_CONTENT_LOADED_LABEL = i18n.translate(
  'xpack.uptime.synthetics.waterfall.domContentLabel',
  {
    defaultMessage: 'DOM Content Loaded',
  }
);

export function WaterfallChartMarkers() {
  const { markerItems } = useWaterfallContext();

  const theme = useTheme();

  if (!markerItems) {
    return null;
  }

  const markersInfo: Record<string, { label: string; color: string }> = {
    domContentLoaded: { label: DOCUMENT_CONTENT_LOADED_LABEL, color: theme.eui.euiColorVis0 },
    firstContentfulPaint: { label: FCP_LABEL, color: theme.eui.euiColorVis1 },
    largestContentfulPaint: { label: LCP_LABEL, color: theme.eui.euiColorVis2 },
    layoutShift: { label: LAYOUT_SHIFT_LABEL, color: theme.eui.euiColorVis3 },
    loadEvent: { label: LOAD_EVENT_LABEL, color: theme.eui.euiColorVis9 },
  };

  return (
    <Wrapper>
      {markerItems.map(({ id, offset }) => (
        <LineAnnotation
          key={id}
          id={id}
          domainType={AnnotationDomainType.YDomain}
          dataValues={[
            {
              dataValue: offset,
              details: markersInfo[id]?.label ?? id,
              header: i18n.translate('xpack.uptime.synthetics.waterfall.offsetUnit', {
                defaultMessage: '{offset} ms',
                values: { offset },
              }),
            },
          ]}
          marker={<EuiIcon type="dot" size="l" />}
          style={{
            line: {
              strokeWidth: 2,
              stroke: markersInfo[id]?.color ?? theme.eui.euiColorMediumShade,
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
