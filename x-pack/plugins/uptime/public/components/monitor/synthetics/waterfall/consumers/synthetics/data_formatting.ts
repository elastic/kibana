/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { euiPaletteColorBlind } from '@elastic/eui';

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

// The timing calculations here are based off several sources:
// https://github.com/ChromeDevTools/devtools-frontend/blob/2fe91adefb2921b4deb2b4b125370ef9ccdb8d1b/front_end/sdk/HARLog.js#L307
// and
// https://chromium.googlesource.com/chromium/blink.git/+/master/Source/devtools/front_end/sdk/HAREntry.js#131
// and
// https://github.com/cyrus-and/chrome-har-capturer/blob/master/lib/har.js#L195
// Order of events: request_start = 0, [proxy], [dns], [connect [ssl]], [send], receive_headers_end

export const getTimings = (
  timings: PayloadTimings,
  requestSentTime: number,
  responseReceivedTime: number
): CalculatedTimings => {
  if (!timings) return { blocked: -1, dns: -1, connect: -1, send: 0, wait: 0, receive: 0, ssl: -1 };

  const getLeastNonNegative = (values: number[]) =>
    values.reduce<number>((best, value) => (value >= 0 && value < best ? value : best), Infinity);
  const getOptionalTiming = (_timings: PayloadTimings, key: keyof PayloadTimings) =>
    _timings[key] >= 0 ? _timings[key] : -1;

  // NOTE: Request sent and request start can differ due to queue times
  const requestStartTime = microToMillis(timings.request_time);

  // Queued
  const queuedTime = requestSentTime < requestStartTime ? requestStartTime - requestSentTime : -1;

  // Blocked
  // "blocked" represents both queued time + blocked/stalled time + proxy time (ie: anything before the request was actually started).
  let blocked = queuedTime;

  const blockedStart = getLeastNonNegative([
    timings.dns_start,
    timings.connect_start,
    timings.send_start,
  ]);

  if (blockedStart !== Infinity) {
    blocked += blockedStart;
  }

  // Proxy
  // Proxy is part of blocked, but it can be quirky in that blocked can be -1 even though there are proxy timings. This can happen with
  // protocols like Quic.
  if (timings.proxy_end !== -1) {
    const blockedProxy = timings.proxy_end - timings.proxy_start;

    if (blockedProxy && blockedProxy > blocked) {
      blocked = blockedProxy;
    }
  }

  // DNS
  const dnsStart = timings.dns_end >= 0 ? blockedStart : 0;
  const dnsEnd = getOptionalTiming(timings, 'dns_end');
  const dns = dnsEnd - dnsStart;

  // SSL
  const sslStart = getOptionalTiming(timings, 'ssl_start');
  const sslEnd = getOptionalTiming(timings, 'ssl_end');
  let ssl;

  if (sslStart >= 0 && sslEnd >= 0) {
    ssl = timings.ssl_end - timings.ssl_start;
  }

  // Connect
  let connect = -1;
  if (timings.connect_start >= 0) {
    connect = timings.send_start - timings.connect_start;
  }

  // Send
  const send = timings.send_end - timings.send_start;

  // Wait
  const wait = timings.receive_headers_end - timings.send_end;

  // Receive
  const receive = responseReceivedTime - (requestStartTime + timings.receive_headers_end);

  // SSL connection is a part of the overall connection time
  if (connect && ssl) {
    connect = connect - ssl;
  }

  return { blocked, dns, connect, send, wait, receive, ssl };
};

// TODO: Switch to real API data, and type data as the payload response (if server response isn't preformatted)
export const extractItems = (data: any): NetworkItems => {
  const items = data
    .map((entry: any) => {
      const requestSentTime = microToMillis(entry.synthetics.payload.start);
      const responseReceivedTime = microToMillis(entry.synthetics.payload.end);
      const requestStartTime =
        entry.synthetics.payload.response && entry.synthetics.payload.response.timing
          ? microToMillis(entry.synthetics.payload.response.timing.request_time)
          : null;

      return {
        timestamp: entry['@timestamp'],
        method: entry.synthetics.payload.method,
        url: entry.synthetics.payload.url,
        status: entry.synthetics.payload.status,
        mimeType: entry.synthetics.payload?.response?.mime_type,
        requestSentTime,
        responseReceivedTime,
        earliestRequestTime: requestStartTime
          ? Math.min(requestSentTime, requestStartTime)
          : requestSentTime,
        timings:
          entry.synthetics.payload.response && entry.synthetics.payload.response.timing
            ? getTimings(
                entry.synthetics.payload.response.timing,
                requestSentTime,
                responseReceivedTime
              )
            : null,
      };
    })
    .sort((a: any, b: any) => {
      return a.earliestRequestTime - b.earliestRequestTime;
    });

  return items;
};

const formatValueForDisplay = (value: number, points: number = 3) => {
  return Number(value).toFixed(points);
};

const getColourForMimeType = (mimeType?: string) => {
  const key = mimeType && MimeTypesMap[mimeType] ? MimeTypesMap[mimeType] : MimeType.Other;
  return colourPalette[key];
};

export const getSeriesAndDomain = (items: NetworkItems) => {
  // The earliest point in time a request is sent or started. This will become our notion of "0".
  const zeroOffset = items.reduce<number>((acc, item) => {
    const { earliestRequestTime } = item;
    return earliestRequestTime < acc ? earliestRequestTime : acc;
  }, Infinity);

  const series = items.reduce<WaterfallData>((acc, item, index) => {
    const { earliestRequestTime } = item;

    // Entries without timings should be handled differently:
    // https://github.com/ChromeDevTools/devtools-frontend/blob/ed2a064ac194bfae4e25c4748a9fa3513b3e9f7d/front_end/network/RequestTimingView.js#L140
    // If there are no concrete timings just plot one block via start and end
    if (!item.timings || item.timings === null) {
      const duration = item.responseReceivedTime - item.earliestRequestTime;
      const colour = getColourForMimeType(item.mimeType);
      return [
        ...acc,
        {
          x: index,
          y0: item.earliestRequestTime - zeroOffset,
          y: item.responseReceivedTime - zeroOffset,
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

    let currentOffset = earliestRequestTime - zeroOffset;

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
