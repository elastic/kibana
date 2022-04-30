/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AnnotationDomainType, LineAnnotation } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { useWaterfallContext } from '..';
import { useTheme } from '../../../../../../../observability/public';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';
import { MarkerItems } from '../context/waterfall_chart';
import { WaterfallMarkerIcon } from './waterfall_marker_icon';

export const FIELD_SYNTHETICS_LCP = 'browser.experience.lcp.us';
export const FIELD_SYNTHETICS_FCP = 'browser.experience.fcp.us';
export const FIELD_SYNTHETICS_DOCUMENT_ONLOAD = 'browser.experience.load.us';
export const FIELD_SYNTHETICS_DCL = 'browser.experience.dcl.us';
export const LAYOUT_SHIFT = 'layoutShift';

export function WaterfallChartMarkers() {
  const { markerItems } = useWaterfallContext();

  const theme = useTheme();

  const markerItemsByOffset = useMemo(
    () =>
      (markerItems ?? []).reduce((acc, cur) => {
        acc.set(cur.offset, [...(acc.get(cur.offset) ?? []), cur]);
        return acc;
      }, new Map<number, MarkerItems>()),
    [markerItems]
  );

  const annotations = useMemo(() => {
    return Array.from(markerItemsByOffset.entries()).map(([offset, items]) => {
      let uniqueIds = (items ?? [])
        .map(({ id }) => id)
        .filter((id, index, arr) => arr.indexOf(id) === index);

      // Omit coinciding layoutShift's with other vital marks
      if (uniqueIds.length > 1) {
        uniqueIds = uniqueIds.filter((id) => id !== LAYOUT_SHIFT);
      }

      const label = uniqueIds.map((id) => getMarkersInfo(id, theme)?.label ?? id).join(' / ');
      const id = uniqueIds[0];
      const markersInfo = getMarkersInfo(id, theme);

      return {
        id,
        offset,
        label,
        field: markersInfo?.field ?? '',
        color: markersInfo?.color ?? theme.eui.euiColorMediumShade,
        strokeWidth: markersInfo?.strokeWidth ?? 1,
      };
    });
  }, [markerItemsByOffset, theme]);

  if (!markerItems) {
    return null;
  }

  return (
    <Wrapper>
      {annotations.map(({ id, offset, label, field, color, strokeWidth }) => {
        const key = `${id}-${offset}`;

        return (
          <LineAnnotation
            key={key}
            id={key}
            domainType={AnnotationDomainType.YDomain}
            dataValues={[
              {
                dataValue: offset,
                details: label,
                header: i18n.translate('xpack.uptime.synthetics.waterfall.offsetUnit', {
                  defaultMessage: '{offset} ms',
                  values: { offset },
                }),
              },
            ]}
            marker={<WaterfallMarkerIcon field={field} label={label} />}
            style={{
              line: {
                strokeWidth,
                stroke: color,
                opacity: 1,
              },
            }}
          />
        );
      })}
    </Wrapper>
  );
}

function getMarkersInfo(id: string, theme: ReturnType<typeof useTheme>) {
  switch (id) {
    case 'domContentLoaded':
      return {
        label: DOCUMENT_CONTENT_LOADED_LABEL,
        color: theme.eui.euiColorVis0,
        field: FIELD_SYNTHETICS_DCL,
        strokeWidth: 2,
      };
    case 'firstContentfulPaint':
      return {
        label: FCP_LABEL,
        color: theme.eui.euiColorVis1,
        field: FIELD_SYNTHETICS_FCP,
        strokeWidth: 2,
      };
    case 'largestContentfulPaint':
      return {
        label: LCP_LABEL,
        color: theme.eui.euiColorVis2,
        field: FIELD_SYNTHETICS_LCP,
        strokeWidth: 2,
      };
    case 'layoutShift':
      return {
        label: LAYOUT_SHIFT_LABEL,
        color: theme.eui.euiColorVis6,
        field: '',
        strokeWidth: 1,
      };
    case 'loadEvent':
      return {
        label: LOAD_EVENT_LABEL,
        color: theme.eui.euiColorVis9,
        field: FIELD_SYNTHETICS_DOCUMENT_ONLOAD,
        strokeWidth: 2,
      };
  }

  return undefined;
}

const Wrapper = euiStyled.span`
  &&& {
    > .echAnnotation__icon {
      top: 8px;
    }
  }
`;

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
