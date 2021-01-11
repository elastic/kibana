/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { euiPaletteColorBlind } from '@elastic/eui';

import {
  NetworkItems,
  NetworkItem,
  FriendlyTimingLabels,
  FriendlyMimetypeLabels,
  MimeType,
  MimeTypesMap,
  Timings,
  TIMING_ORDER,
  SidebarItems,
  LegendItems,
} from './types';
import { WaterfallData } from '../../waterfall';
import { NetworkEvent } from '../../../../../../common/runtime_types';

export const extractItems = (data: NetworkEvent[]): NetworkItems => {
  // NOTE: This happens client side as the "payload" property is mapped
  // in such a way it can't be queried (or sorted on) via ES.
  return data.sort((a: NetworkItem, b: NetworkItem) => {
    return a.requestSentTime - b.requestSentTime;
  });
};

const formatValueForDisplay = (value: number, points: number = 3) => {
  return Number(value).toFixed(points);
};

const getColourForMimeType = (mimeType?: string) => {
  const key = mimeType && MimeTypesMap[mimeType] ? MimeTypesMap[mimeType] : MimeType.Other;
  return colourPalette[key];
};

const getFriendlyTooltipValue = ({
  value,
  timing,
  mimeType,
}: {
  value: number;
  timing: Timings;
  mimeType?: string;
}) => {
  let label = FriendlyTimingLabels[timing];
  if (timing === Timings.Receive && mimeType) {
    const formattedMimeType: MimeType = MimeTypesMap[mimeType];
    label += ` (${FriendlyMimetypeLabels[formattedMimeType]})`;
  }
  return `${label}: ${formatValueForDisplay(value)}ms`;
};

export const getSeriesAndDomain = (items: NetworkItems) => {
  const getValueForOffset = (item: NetworkItem) => {
    return item.requestSentTime;
  };

  // The earliest point in time a request is sent or started. This will become our notion of "0".
  const zeroOffset = items.reduce<number>((acc, item) => {
    const offsetValue = getValueForOffset(item);
    return offsetValue < acc ? offsetValue : acc;
  }, Infinity);

  const getValue = (timings: NetworkEvent['timings'], timing: Timings) => {
    if (!timings) return;

    // SSL is a part of the connect timing
    if (timing === Timings.Connect && timings.ssl > 0) {
      return timings.connect - timings.ssl;
    } else {
      return timings[timing];
    }
  };

  const series = items.reduce<WaterfallData>((acc, item, index) => {
    if (!item.timings) {
      acc.push({
        x: index,
        y0: 0,
        y: 0,
        config: {
          showTooltip: false,
        },
      });
      return acc;
    }

    const offsetValue = getValueForOffset(item);
    const mimeTypeColour = getColourForMimeType(item.mimeType);

    let currentOffset = offsetValue - zeroOffset;

    TIMING_ORDER.forEach((timing) => {
      const value = getValue(item.timings, timing);
      const colour = timing === Timings.Receive ? mimeTypeColour : colourPalette[timing];
      if (value && value >= 0) {
        const y = currentOffset + value;

        acc.push({
          x: index,
          y0: currentOffset,
          y,
          config: {
            colour,
            showTooltip: true,
            tooltipProps: {
              value: getFriendlyTooltipValue({
                value: y - currentOffset,
                timing,
                mimeType: item.mimeType,
              }),
              colour,
            },
          },
        });
        currentOffset = y;
      }
    });

    /* if no specific timing values are found, use the total time
     * if total time is not available use 0, set showTooltip to false,
     * and omit tooltip props */
    if (!acc.find((entry) => entry.x === index)) {
      const total = item.timings.total;
      const hasTotal = total !== -1;
      acc.push({
        x: index,
        y0: hasTotal ? currentOffset : 0,
        y: hasTotal ? currentOffset + item.timings.total : 0,
        config: {
          colour: hasTotal ? mimeTypeColour : '',
          showTooltip: hasTotal,
          tooltipProps: hasTotal
            ? {
                value: getFriendlyTooltipValue({
                  value: total,
                  timing: Timings.Receive,
                  mimeType: item.mimeType,
                }),
                colour: mimeTypeColour,
              }
            : undefined,
        },
      });
    }
    return acc;
  }, []);

  const yValues = series.map((serie) => serie.y);
  const domain = { min: 0, max: Math.max(...yValues) };
  return { series, domain };
};

export const getSidebarItems = (items: NetworkItems): SidebarItems => {
  return items.map((item) => {
    const { url, status, method } = item;
    return { url, status, method };
  });
};

export const getLegendItems = (): LegendItems => {
  let timingItems: LegendItems = [];
  Object.values(Timings).forEach((timing) => {
    // The "receive" timing is mapped to a mime type colour, so we don't need to show this in the legend
    if (timing === Timings.Receive) {
      return;
    }
    timingItems = [
      ...timingItems,
      { name: FriendlyTimingLabels[timing], colour: TIMING_PALETTE[timing] },
    ];
  });

  let mimeTypeItems: LegendItems = [];
  Object.values(MimeType).forEach((mimeType) => {
    mimeTypeItems = [
      ...mimeTypeItems,
      { name: FriendlyMimetypeLabels[mimeType], colour: MIME_TYPE_PALETTE[mimeType] },
    ];
  });
  return [...timingItems, ...mimeTypeItems];
};

// Timing colour palette
type TimingColourPalette = {
  [K in Timings]: string;
};

const SAFE_PALETTE = euiPaletteColorBlind({ rotations: 2 });

const buildTimingPalette = (): TimingColourPalette => {
  const palette = Object.values(Timings).reduce<Partial<TimingColourPalette>>((acc, value) => {
    switch (value) {
      case Timings.Blocked:
        acc[value] = SAFE_PALETTE[6];
        break;
      case Timings.Dns:
        acc[value] = SAFE_PALETTE[0];
        break;
      case Timings.Connect:
        acc[value] = SAFE_PALETTE[7];
        break;
      case Timings.Ssl:
        acc[value] = SAFE_PALETTE[17];
        break;
      case Timings.Send:
        acc[value] = SAFE_PALETTE[2];
        break;
      case Timings.Wait:
        acc[value] = SAFE_PALETTE[11];
        break;
      case Timings.Receive:
        acc[value] = SAFE_PALETTE[0];
        break;
    }
    return acc;
  }, {});

  return palette as TimingColourPalette;
};

const TIMING_PALETTE = buildTimingPalette();

// MimeType colour palette
type MimeTypeColourPalette = {
  [K in MimeType]: string;
};

const buildMimeTypePalette = (): MimeTypeColourPalette => {
  const palette = Object.values(MimeType).reduce<Partial<MimeTypeColourPalette>>((acc, value) => {
    switch (value) {
      case MimeType.Html:
        acc[value] = SAFE_PALETTE[19];
        break;
      case MimeType.Script:
        acc[value] = SAFE_PALETTE[3];
        break;
      case MimeType.Stylesheet:
        acc[value] = SAFE_PALETTE[4];
        break;
      case MimeType.Media:
        acc[value] = SAFE_PALETTE[5];
        break;
      case MimeType.Font:
        acc[value] = SAFE_PALETTE[8];
        break;
      case MimeType.Other:
        acc[value] = SAFE_PALETTE[9];
        break;
    }
    return acc;
  }, {});

  return palette as MimeTypeColourPalette;
};

const MIME_TYPE_PALETTE = buildMimeTypePalette();

type ColourPalette = TimingColourPalette & MimeTypeColourPalette;

export const colourPalette: ColourPalette = { ...TIMING_PALETTE, ...MIME_TYPE_PALETTE };
