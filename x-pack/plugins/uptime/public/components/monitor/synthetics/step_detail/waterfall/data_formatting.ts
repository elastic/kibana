/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import moment from 'moment';

import {
  NetworkItems,
  NetworkItem,
  FriendlyFlyoutLabels,
  FriendlyTimingLabels,
  FriendlyMimetypeLabels,
  MimeType,
  MimeTypesMap,
  Timings,
  Metadata,
  TIMING_ORDER,
  SidebarItems,
  LegendItems,
} from './types';
import { WaterfallData, WaterfallMetadata } from '../../waterfall';
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
    label += ` (${FriendlyMimetypeLabels[formattedMimeType] || mimeType})`;
  }
  return `${label}: ${formatValueForDisplay(value)}ms`;
};

const getFriendlyMetadataValue = ({ value, postFix }: { value?: number; postFix?: string }) => {
  // value === -1 indicates timing data cannot be extracted
  if (value === undefined || value === -1) {
    return undefined;
  }

  let formattedValue = formatValueForDisplay(value);

  if (postFix) {
    formattedValue = `${formattedValue} ${postFix}`;
  }

  return formattedValue;
};

const getValueForOffset = (item: NetworkItem): number => {
  return item.requestSentTime;
};

const getCurrentOffset = (item: NetworkItem, zeroOffset: number): number => {
  const offsetValue = getValueForOffset(item);

  return offsetValue - zeroOffset;
};

export const getConnectingTime = (connect?: number, ssl?: number) => {
  if (ssl && connect && ssl > 0) {
    return connect - ssl;
  } else {
    return connect;
  }
};

export const getSeriesAndDomain = (items: NetworkItems) => {
  // The earliest point in time a request is sent or started. This will become our notion of "0".
  let zeroOffset = Infinity;
  items.forEach((i) => (zeroOffset = Math.min(zeroOffset, getValueForOffset(i))));

  const getValue = (timings: NetworkEvent['timings'], timing: Timings) => {
    if (!timings) return;

    // SSL is a part of the connect timing
    if (timing === Timings.Connect) {
      return getConnectingTime(timings.connect, timings.ssl);
    }
    return timings[timing];
  };

  const series: WaterfallData = [];
  const metadata: WaterfallMetadata = [];

  items.forEach((item, index) => {
    const mimeTypeColour = getColourForMimeType(item.mimeType);
    let currentOffset = getCurrentOffset(item, zeroOffset);
    let timingFound = false;
    metadata.push(formatMetadata({ item, index, requestStart: currentOffset }));

    if (!item.timings) {
      series.push({
        x: index,
        y0: 0,
        y: 0,
        config: {
          showTooltip: false,
        },
      });
      return;
    }

    TIMING_ORDER.forEach((timing) => {
      const value = getValue(item.timings, timing);
      const colour = timing === Timings.Receive ? mimeTypeColour : colourPalette[timing];
      if (value && value >= 0) {
        timingFound = true;
        const y = currentOffset + value;

        series.push({
          x: index,
          y0: currentOffset,
          y,
          config: {
            id: index,
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
    if (!timingFound) {
      const total = item.timings.total;
      const hasTotal = total !== -1;
      series.push({
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
  });

  const yValues = series.map((serie) => serie.y);
  const domain = { min: 0, max: Math.max(...yValues) };
  return { series, domain, metadata };
};

const formatHeaders = (headers?: Record<string, unknown>) => {
  if (typeof headers === 'undefined') {
    return undefined;
  }
  return Object.keys(headers).map((key) => ({
    name: key,
    value: `${headers[key]}`,
  }));
};

const formatMetadata = ({
  item,
  index,
  requestStart,
}: {
  item: NetworkItem;
  index: number;
  requestStart: number;
}) => {
  const { bytesDownloaded, mimeType, url, requestHeaders, responseHeaders, certificates } = item;
  const { dns, connect, ssl, wait, receive, total } = item.timings || {};
  const contentDownloaded = receive && receive > 0 ? receive : total;
  return {
    x: index,
    url,
    requestHeaders: formatHeaders(requestHeaders),
    responseHeaders: formatHeaders(responseHeaders),
    certificates: certificates
      ? [
          {
            name: FriendlyFlyoutLabels[Metadata.CertificateIssuer],
            value: certificates.issuer,
          },
          {
            name: FriendlyFlyoutLabels[Metadata.CertificateIssueDate],
            value: certificates.validFrom
              ? moment(certificates.validFrom).format('L LT')
              : undefined,
          },
          {
            name: FriendlyFlyoutLabels[Metadata.CertificateExpiryDate],
            value: certificates.validTo ? moment(certificates.validTo).format('L LT') : undefined,
          },
          {
            name: FriendlyFlyoutLabels[Metadata.CertificateSubject],
            value: certificates.subjectName,
          },
        ]
      : undefined,
    details: [
      { name: FriendlyFlyoutLabels[Metadata.MimeType], value: mimeType },
      {
        name: FriendlyFlyoutLabels[Metadata.RequestStart],
        value: getFriendlyMetadataValue({ value: requestStart, postFix: 'ms' }),
      },
      {
        name: FriendlyTimingLabels[Timings.Dns],
        value: getFriendlyMetadataValue({ value: dns, postFix: 'ms' }),
      },
      {
        name: FriendlyTimingLabels[Timings.Connect],
        value: getFriendlyMetadataValue({ value: getConnectingTime(connect, ssl), postFix: 'ms' }),
      },
      {
        name: FriendlyTimingLabels[Timings.Ssl],
        value: getFriendlyMetadataValue({ value: ssl, postFix: 'ms' }),
      },
      {
        name: FriendlyTimingLabels[Timings.Wait],
        value: getFriendlyMetadataValue({ value: wait, postFix: 'ms' }),
      },
      {
        name: FriendlyTimingLabels[Timings.Receive],
        value: getFriendlyMetadataValue({
          value: contentDownloaded,
          postFix: 'ms',
        }),
      },
      {
        name: FriendlyFlyoutLabels[Metadata.BytesDownloaded],
        value: getFriendlyMetadataValue({
          value: bytesDownloaded ? bytesDownloaded / 1000 : undefined,
          postFix: 'KB',
        }),
      },
    ],
  };
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
        acc[value] = SAFE_PALETTE[16];
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
