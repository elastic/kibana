/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import testData from './bmc_test_data.json';
const TEST_DATA = testData.data.map((item) => {
  return item._source;
});

import {
  PayloadTimings,
  CalculatedTimings,
  NetworkItems,
  FriendlyTimingLabels,
  FriendlyMimetypeLabels,
  MimeType,
  MimeTypesMap,
  Timings,
  TIMING_ORDER,
  SidebarItems,
  LegendItems,
} from './types';
import { WaterfallData } from '../../../waterfall';

const microToMillis = (micro: number): number => (micro === -1 ? -1 : micro * 1000);

// Based off the source code from Chrome dev tools:
// https://chromium.googlesource.com/chromium/blink.git/+/master/Source/devtools/front_end/sdk/HAREntry.js#131
// Order of events: request_start = 0, [proxy], [dns], [connect [ssl]], [send], receive_headers_end
// 'blocked' time is the time before the first network activity
// There's also https://github.com/sitespeedio/chrome-har/blob/90670e8923a50a015b1bcb85f606949997a469b0/lib/entryFromResponse.js#L153-L163,
// for reference.

const getTimings = (timings: PayloadTimings, durationInMs: number): CalculatedTimings => {
  if (!timings) return { blocked: -1, dns: -1, connect: -1, send: 0, wait: 0, receive: 0, ssl: -1 };

  const getFirstNonNegative = (values: number[]) => values.find((value) => value >= 0);
  const getOptionalTiming = (_timings: PayloadTimings, key: keyof PayloadTimings) =>
    _timings[key] >= 0 ? _timings[key] : -1;

  const blocked = getFirstNonNegative([
    timings.dns_start,
    timings.connect_start,
    timings.send_start,
  ]);
  const dnsStart = getOptionalTiming(timings, 'dns_start');
  let dns;

  if (dnsStart >= 0) {
    dns = getFirstNonNegative([timings.connect_start, timings.send_start])! - timings.dns_start;
  }

  const connectStart = getOptionalTiming(timings, 'connect_start');
  let connect;

  if (connectStart >= 0) {
    connect = timings.send_start - timings.connect_start;
  }

  const send = timings.send_end - timings.send_start;
  const wait = timings.receive_headers_end - timings.send_end;
  const receive = durationInMs - timings.receive_headers_end;

  const sslStart = getOptionalTiming(timings, 'ssl_start');
  const sslEnd = getOptionalTiming(timings, 'ssl_end');
  let ssl;

  if (sslStart >= 0 && sslEnd >= 0) {
    ssl = timings.ssl_end - timings.ssl_start;
  }

  // SSL connection is a part of the overall connection time
  if (connect && ssl) {
    connect = connect - ssl;
  }

  return { blocked, dns, connect, send, wait, receive, ssl };
};

const getDuration = (startMicro: number, endMicro: number) => endMicro - startMicro;

// TODO: Switch to real API data, and type data as the payload response (if server response isn't preformatted)
export const extractItems = (data?: any): NetworkItems => {
  return TEST_DATA.map((entry) => {
    const duration = microToMillis(
      getDuration(entry.synthetics.payload.start, entry.synthetics.payload.end)
    );

    return {
      timestamp: entry['@timestamp'],
      method: entry.synthetics.payload.method,
      url: entry.synthetics.payload.url,
      status: entry.synthetics.payload.status,
      mimeType: entry.synthetics.payload?.response?.mime_type,
      startMs: microToMillis(entry.synthetics.payload.start),
      endMs: microToMillis(entry.synthetics.payload.end),
      duration,
      timings:
        entry.synthetics.payload.response && entry.synthetics.payload.response.timing
          ? getTimings(entry.synthetics.payload.response.timing, duration)
          : null,
    };
  }).sort((a, b) => {
    return a.startMs - b.startMs;
  });
};

export const getDomain = (items: NetworkItems) => {
  const starts = items.map((item) => item.startMs);
  const ends = items.map((item) => item.endMs);
  // Min will become our zeroOffset, it is the monotonic clock value
  // that will represent 0ms.
  const min = Math.min(...starts);
  const max = Math.max(...ends);
  const totalMs = max - min;
  return { min: 0, max: totalMs, zeroOffset: min };
};

const formatValueForDisplay = (value: number, points: number = 3) => {
  return Number(value).toFixed(points);
};

const getColourForMimeType = (mimeType?: string) => {
  const key = mimeType && MimeTypesMap[mimeType] ? MimeTypesMap[mimeType] : MimeType.Other;
  return colourPalette[key];
};

// TODO: i18n values
export const getSeries = (items: NetworkItems) => {
  const { zeroOffset } = getDomain(items);
  return items.reduce<WaterfallData>((acc, item, index) => {
    const { startMs, duration } = item;

    // If there are no concrete timings just plot one block via start and end
    if (!item.timings || item.timings === null) {
      const colour = getColourForMimeType(item.mimeType);
      return [
        ...acc,
        {
          x: index,
          y0: item.startMs - zeroOffset,
          y: item.endMs - zeroOffset,
          config: {
            colour,
            tooltipProps: {
              value: `${formatValueForDisplay(duration)}ms`,
              colour,
            },
          },
        },
      ];
    }

    let currentOffset = startMs - zeroOffset;

    TIMING_ORDER.forEach((timing) => {
      const value = item.timings![timing];
      const colour =
        timing === Timings.Receive ? getColourForMimeType(item.mimeType) : colourPalette[timing];
      if (value && value >= 0) {
        const y = currentOffset + value;
        acc.push({
          x: index,
          y0: currentOffset,
          y,
          config: {
            colour,
            tooltipProps: {
              value: `${FriendlyTimingLabels[timing]}: ${formatValueForDisplay(
                y - currentOffset
              )}ms`,
              colour,
            },
          },
        });
        currentOffset = y;
      }
    });
    return acc;
  }, []);
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
