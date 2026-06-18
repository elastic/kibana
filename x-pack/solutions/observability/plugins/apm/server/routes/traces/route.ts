/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import AdmZip from 'adm-zip';
import Boom from '@hapi/boom';
import { toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import { enableSynthtraceCapture } from '@kbn/observability-plugin/common';
import * as t from 'io-ts';
import type { Error } from '@kbn/apm-types';
import type {
  ErrorsByTraceId,
  UnifiedSpanDocument,
  TraceRootSpan,
  FocusedTraceItems,
  TransactionDetailRedirectInfo,
} from '@kbn/apm-types';
import type { TraceItem } from '../../../common/waterfall/unified_trace_item';
import type { Span } from '../../../typings/es_schemas/ui/span';
import type { Transaction } from '../../../typings/es_schemas/ui/transaction';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, probabilityRt, rangeRt } from '../default_api_types';
import { getSpan } from '../transactions/get_span';
import { getTransaction } from '../transactions/get_transaction';
import { getTransactionByName } from '../transactions/get_transaction_by_name';
import { getRootTransactionByTraceId } from '../transactions/get_transaction_by_trace';
import { buildFocusedTraceItems, findRootItem } from './build_focused_trace_items';
import type { TopTracesPrimaryStatsResponse } from './get_top_traces_primary_stats';
import { getTopTracesPrimaryStats } from './get_top_traces_primary_stats';
import { getTraceSummaryCount } from './get_trace_summary_count';
import { getUnifiedTraceItems } from './get_unified_trace_items';
import { getUnifiedTraceErrors } from './get_unified_trace_errors';
import { createLogsClient } from '../../lib/helpers/create_es_client/create_logs_client';
import { getUnifiedTraceSpan } from './get_unified_trace_span';
import {
  getApmCaptureDocs,
  reconstructTrace,
  generateScenario,
} from '@kbn/synthtrace-scenario-codegen';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import {
  TRANSACTION_DURATION,
  SPAN_DURATION,
  DURATION,
  SPAN_ID,
} from '../../../common/es_fields/apm';
import { parseOtelDuration } from '../../lib/helpers/parse_otel_duration';

const tracesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/traces',
  params: t.type({
    query: t.intersection([environmentRt, kueryRt, rangeRt, probabilityRt]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<TopTracesPrimaryStatsResponse> => {
    const { config, params, request, core } = resources;

    const { environment, kuery, start, end, probability } = params.query;

    const coreStart = await core.start();
    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ coreStart, request, probability }),
    ]);

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config,
      kuery,
      start,
      end,
    });

    return await getTopTracesPrimaryStats({
      environment,
      kuery,
      apmEventClient,
      searchAggregatedTransactions,
      start,
      end,
      randomSampler,
    });
  },
});

const unifiedTracesByIdRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/unified_traces/{traceId}',
  params: t.type({
    path: t.type({
      traceId: t.string,
    }),
    query: t.intersection([
      rangeRt,
      t.partial({
        serviceName: t.string,
        entryTransactionId: t.string,
        ecsOnly: toBooleanRt,
      }),
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    traceItems: TraceItem[];
    errors: Error[];
    agentMarks: Record<string, number>;
    entryTransaction?: Transaction;
    traceDocsTotal: number;
    maxTraceItems: number;
  }> => {
    const [apmEventClient, logsClient] = await Promise.all([
      getApmEventClient(resources),
      createLogsClient(resources),
    ]);

    const { params, config } = resources;
    const { traceId } = params.path;
    const { start, end, serviceName, entryTransactionId, ecsOnly } = params.query;
    const maxTraceItems = config.ui.maxTraceItems;

    const [{ traceItems, agentMarks, unifiedTraceErrors, traceDocsTotal }, entryTransaction] =
      await Promise.all([
        getUnifiedTraceItems({
          apmEventClient,
          logsClient,
          traceId,
          start,
          end,
          maxTraceItems,
          serviceName,
          ecsOnly: ecsOnly ?? false,
        }),
        entryTransactionId
          ? getTransaction({
              transactionId: entryTransactionId,
              traceId,
              apmEventClient,
              start,
              end,
            })
          : Promise.resolve(undefined),
      ]);

    return {
      traceItems,
      // For now we, we only return apm errors to show as marks in the waterfall
      errors: unifiedTraceErrors.apmErrors,
      agentMarks,
      entryTransaction,
      traceDocsTotal,
      maxTraceItems,
    };
  },
});

const unifiedTracesByIdSummaryRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/unified_traces/{traceId}/summary',
  params: t.type({
    path: t.type({
      traceId: t.string,
    }),
    query: t.intersection([rangeRt, t.partial({ maxTraceItems: toNumberRt, docId: t.string })]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    traceItems?: FocusedTraceItems;
    summary: { services: number; traceEvents: number; errors: number };
  }> => {
    const [apmEventClient, logsClient] = await Promise.all([
      getApmEventClient(resources),
      createLogsClient(resources),
    ]);

    const { params, config } = resources;
    const { traceId } = params.path;
    const { start, end, docId } = params.query;

    const maxTraceItems = params.query.maxTraceItems ?? config.ui.maxTraceItems;

    const [{ traceItems, unifiedTraceErrors }, traceSummaryCount] = await Promise.all([
      getUnifiedTraceItems({
        apmEventClient,
        logsClient,
        traceId,
        start,
        end,
        maxTraceItems,
      }),
      getTraceSummaryCount({ apmEventClient, start, end, traceId }),
    ]);

    const focusedDocId = docId ?? findRootItem(traceItems)?.id;
    const focusedTraceItems = focusedDocId
      ? buildFocusedTraceItems({ traceItems, docId: focusedDocId })
      : undefined;

    return {
      traceItems: focusedTraceItems,
      summary: { ...traceSummaryCount, errors: unifiedTraceErrors.totalErrors },
    };
  },
});

const unifiedTracesByIdErrorsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/unified_traces/{traceId}/errors',
  params: t.type({
    path: t.type({
      traceId: t.string,
    }),
    query: t.intersection([rangeRt, t.partial({ docId: t.string })]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ErrorsByTraceId> => {
    const [apmEventClient, logsClient] = await Promise.all([
      getApmEventClient(resources),
      createLogsClient(resources),
    ]);

    const { params } = resources;
    const { traceId } = params.path;
    const { start, end, docId } = params.query;

    const { apmErrors, unprocessedOtelErrors } = await getUnifiedTraceErrors({
      apmEventClient,
      logsClient,
      docId,
      traceId,
      start,
      end,
    });

    if (apmErrors.length > 0) {
      return { traceErrors: apmErrors, source: 'apm' };
    }

    return { traceErrors: unprocessedOtelErrors, source: 'unprocessedOtel' };
  },
});

const rootTransactionByTraceIdRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/traces/{traceId}/root_transaction',
  params: t.type({
    path: t.type({
      traceId: t.string,
    }),
    query: rangeRt,
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    transaction?: TransactionDetailRedirectInfo;
  }> => {
    const {
      params: {
        path: { traceId },
        query: { start, end },
      },
    } = resources;

    const apmEventClient = await getApmEventClient(resources);

    return getRootTransactionByTraceId({ traceId, apmEventClient, start, end });
  },
});

const rootItemByTraceIdRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/unified_traces/{traceId}/root_span',
  params: t.type({
    path: t.type({
      traceId: t.string,
    }),
    query: rangeRt,
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<TraceRootSpan | undefined> => {
    const {
      params: {
        path: { traceId },
        query: { start, end },
      },
    } = resources;

    const apmEventClient = await getApmEventClient(resources);
    const optionalFields = asMutableArray([
      TRANSACTION_DURATION,
      SPAN_DURATION,
      DURATION,
      SPAN_ID,
    ] as const);

    const span = await getUnifiedTraceSpan({
      traceId,
      apmEventClient,
      start,
      end,
      fields: optionalFields,
    });

    if (!span) {
      return undefined;
    }

    const apmDuration = span.transaction?.duration?.us ?? span.span?.duration?.us;
    const otelDuration = span.duration;

    const duration = apmDuration ?? parseOtelDuration(otelDuration);

    if (duration === undefined) {
      return undefined;
    }

    return {
      duration,
    };
  },
});

const transactionByIdRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/transactions/{transactionId}',
  params: t.type({
    path: t.type({
      transactionId: t.string,
    }),
    query: rangeRt,
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    transaction?: Transaction;
  }> => {
    const {
      params: {
        path: { transactionId },
        query: { start, end },
      },
    } = resources;

    const apmEventClient = await getApmEventClient(resources);
    return {
      transaction: await getTransaction({
        transactionId,
        apmEventClient,
        start,
        end,
      }),
    };
  },
});

const transactionByNameRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/transactions',
  params: t.type({
    query: t.intersection([
      rangeRt,
      t.type({
        transactionName: t.string,
        serviceName: t.string,
      }),
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    transaction?: TransactionDetailRedirectInfo;
  }> => {
    const {
      params: {
        query: { start, end, transactionName, serviceName },
      },
    } = resources;

    const apmEventClient = await getApmEventClient(resources);
    return {
      transaction: await getTransactionByName({
        transactionName,
        apmEventClient,
        start,
        end,
        serviceName,
      }),
    };
  },
});

const transactionFromTraceByIdRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/traces/{traceId}/transactions/{transactionId}',
  params: t.type({
    path: t.type({
      traceId: t.string,
      transactionId: t.string,
    }),
    query: rangeRt,
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<Transaction | undefined> => {
    const { params } = resources;
    const {
      path: { transactionId, traceId },
      query: { start, end },
    } = params;

    const apmEventClient = await getApmEventClient(resources);
    return await getTransaction({
      transactionId,
      traceId,
      apmEventClient,
      start,
      end,
    });
  },
});

const spanFromTraceByIdRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/traces/{traceId}/spans/{spanId}',
  params: t.type({
    path: t.type({
      traceId: t.string,
      spanId: t.string,
    }),
    query: t.intersection([
      rangeRt,
      t.union([t.partial({ parentTransactionId: t.string }), t.undefined]),
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    span?: Span;
    parentTransaction?: Transaction;
  }> => {
    const { params } = resources;
    const {
      path: { spanId, traceId },
      query: { start, end, parentTransactionId },
    } = params;

    const apmEventClient = await getApmEventClient(resources);
    return await getSpan({
      spanId,
      parentTransactionId,
      traceId,
      apmEventClient,
      start,
      end,
    });
  },
});

const unifiedTraceSpanRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/unified_traces/{traceId}/spans/{spanId}',
  params: t.type({
    path: t.type({
      traceId: t.string,
      spanId: t.string,
    }),
    query: rangeRt,
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<UnifiedSpanDocument | undefined> => {
    const {
      params: {
        path: { traceId, spanId },
        query: { start, end },
      },
    } = resources;

    const apmEventClient = await getApmEventClient(resources);

    return getUnifiedTraceSpan({ spanId, traceId, apmEventClient, start, end });
  },
});

/**
 * Trace ids are sampled per service (up to this many services) so the capture mirrors the
 * full set of services visible on the page. A flat top-N trace aggregation would otherwise
 * be dominated by a few high-volume services and silently drop the rest.
 */
const SYNTHTRACE_CAPTURE_MAX_SERVICES = 500;
/**
 * How many traces to sample for each service. Set high enough that re-capturing an
 * already-captured scenario stays faithful: distributed traces make a single service
 * participate in more traces than were sampled under its own quota, so a low cap would
 * silently drop those on a round-trip. `maxDocs` still bounds the total volume.
 */
const SYNTHTRACE_CAPTURE_TRACES_PER_SERVICE = 500;
/**
 * Document caps. The generated scenario emits the capture as a data literal + a fixed builder
 * loop (not one `const` per event), so it no longer hits the JS engine's per-function variable
 * ceiling; these caps now exist only to bound Elasticsearch scan cost and the size of the
 * single in-memory string we build server-side and download in the browser.
 */
const SYNTHTRACE_CAPTURE_MAX_DOCS = 150000;
const SYNTHTRACE_CAPTURE_MAX_METRIC_DOCS = 75000;
/**
 * The capture is always clamped to (at most) this much of the most recent part of the
 * selected time range. This bounds how much data Elasticsearch has to scan regardless of
 * how wide a range the user picked (e.g. "last 10 years"), and ensures we reconstruct the
 * most recent — i.e. what the user is actually looking at — rather than the oldest data.
 */
const SYNTHTRACE_CAPTURE_MAX_WINDOW_MS = 24 * 60 * 60 * 1000;
/**
 * The capture window is split into sub-windows of at most this duration, each captured and
 * emitted as its own self-contained scenario file. Slicing keeps every Elasticsearch query
 * bounded and naturally produces a batch of files (zipped) instead of one unwieldy file.
 *
 * The discovery aggregation is bounded server-side (see `get_capture_docs`), so slices can be
 * relatively wide: the whole handler must finish within Kibana's ~120s socket timeout, so we
 * favour fewer, larger slices (e.g. ~12 for a 24h capture) over many tiny ones (96 fifteen-minute
 * slices ran past that timeout and the browser reported "Failed to fetch").
 */
const SYNTHTRACE_CAPTURE_SLICE_MS = 2 * 60 * 60 * 1000;
/** Hard ceiling on the number of slices, so a misconfiguration can't fan out into thousands of queries. */
const SYNTHTRACE_CAPTURE_MAX_SLICES = 200;
/** How many slices to capture in parallel. Bounded so we don't hammer Elasticsearch. */
const SYNTHTRACE_CAPTURE_SLICE_CONCURRENCY = 5;
/**
 * Floors for the per-slice document budget so that a capture split into many slices still keeps
 * each slice meaningful (the global cap is divided across slices; see the handler).
 */
const SYNTHTRACE_CAPTURE_MIN_DOCS_PER_SLICE = 2000;
const SYNTHTRACE_CAPTURE_MIN_METRIC_DOCS_PER_SLICE = 1000;
/**
 * Soft ceiling on the combined size of all generated scenario files. Once exceeded, remaining
 * (most recent) slices are dropped and the zip is flagged partial. Kept low enough that the
 * base64-encoded response stays downloadable in the browser and cheap to build server-side.
 */
const SYNTHTRACE_CAPTURE_MAX_TOTAL_BYTES = 60 * 1024 * 1024;

/** Runs `fn` over `items` with a bounded number of concurrent executions, preserving order. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runWorker = async (): Promise<void> => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) {
        return;
      }
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, limit), items.length) }, runWorker)
  );
  return results;
}

const synthtraceScenarioRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/synthtrace_scenario',
  params: t.type({
    query: t.intersection([
      rangeRt,
      environmentRt,
      kueryRt,
      t.partial({
        serviceName: t.string,
        transactionType: t.string,
        transactionName: t.string,
      }),
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<
    { scenario: string; filename: string } | { zipBase64: string; filename: string }
  > => {
    const { params, context } = resources;
    const { start, end, environment, kuery, serviceName, transactionType, transactionName } =
      params.query;

    // Defense in depth: this developer tool is gated behind an off-by-default ui setting.
    const coreContext = await context.core;
    const isEnabled = await coreContext.uiSettings.client.get<boolean>(enableSynthtraceCapture);
    if (!isEnabled) {
      throw Boom.forbidden(
        `The "${enableSynthtraceCapture}" advanced setting must be enabled to capture synthtrace scenarios.`
      );
    }

    const apmEventClient = await getApmEventClient(resources);

    // Clamp the requested range to a bounded, most-recent window so an extreme range
    // (e.g. "last 10 years") can't make Elasticsearch scan an unbounded amount of data.
    const captureStart = Math.max(start, end - SYNTHTRACE_CAPTURE_MAX_WINDOW_MS);
    const windowClamped = captureStart > start;

    // Split the (clamped) window into bounded slices. Each slice is captured independently so no
    // single Elasticsearch query has to span the whole range, then emitted as its own scenario.
    const span = Math.max(0, end - captureStart);
    const sliceCount = Math.min(
      Math.max(1, Math.ceil(span / SYNTHTRACE_CAPTURE_SLICE_MS)),
      SYNTHTRACE_CAPTURE_MAX_SLICES
    );
    const sliceMs = Math.ceil(span / sliceCount) || span || 1;
    const slices = Array.from({ length: sliceCount }, (_, index) => {
      const sliceStart = captureStart + index * sliceMs;
      return { index, start: sliceStart, end: Math.min(end, sliceStart + sliceMs) };
    }).filter((slice) => slice.start < slice.end || sliceCount === 1);

    // Distribute a single global document budget across the slices, rather than letting every
    // slice capture up to the full cap. Otherwise a dense deployment captured over a wide range
    // would emit one ~max-size file per slice (hundreds of MB total), which the browser can't
    // download (it fails with "Failed to fetch") and which strains the server. With a shared
    // budget the whole zip stays roughly the size of a single-window capture, just spread over time.
    const perSliceMaxDocs = Math.max(
      SYNTHTRACE_CAPTURE_MIN_DOCS_PER_SLICE,
      Math.ceil(SYNTHTRACE_CAPTURE_MAX_DOCS / sliceCount)
    );
    const perSliceMaxMetricDocs = Math.max(
      SYNTHTRACE_CAPTURE_MIN_METRIC_DOCS_PER_SLICE,
      Math.ceil(SYNTHTRACE_CAPTURE_MAX_METRIC_DOCS / sliceCount)
    );

    const captureSlice = async (slice: {
      index: number;
      start: number;
      end: number;
    }): Promise<{ index: number; scenario: string } | null> => {
      const { docs, truncated } = await getApmCaptureDocs({
        search: (operationName, searchParams) => apmEventClient.search(operationName, searchParams),
        start: slice.start,
        end: slice.end,
        environment,
        kuery,
        serviceName,
        transactionType,
        transactionName,
        maxServices: SYNTHTRACE_CAPTURE_MAX_SERVICES,
        tracesPerService: SYNTHTRACE_CAPTURE_TRACES_PER_SERVICE,
        maxDocs: perSliceMaxDocs,
        maxMetricDocs: perSliceMaxMetricDocs,
      });

      if (docs.length === 0) {
        return null;
      }

      // Always anonymize identifying strings (service/instance/environment names, URLs,
      // dependencies, transaction/span names, error messages) so captured production data
      // can be safely shared. Numeric/structural values are preserved.
      const reconstructedTrace = reconstructTrace(docs, { scrub: true });

      const windowText = `${new Date(slice.start).toISOString()} to ${new Date(
        slice.end
      ).toISOString()}`;
      const description =
        sliceCount > 1
          ? `Captured APM data from ${windowText} (part ${slice.index + 1} of ${sliceCount}).`
          : windowClamped
          ? `Captured the most recent ${
              SYNTHTRACE_CAPTURE_MAX_WINDOW_MS / (60 * 60 * 1000)
            } hour(s) of APM data (the selected range was wider and was clamped), ending ${new Date(
              end
            ).toISOString()}.`
          : `Captured the APM data visible from ${windowText}.`;

      const scenario = generateScenario(reconstructedTrace, {
        description,
        truncated: truncated || windowClamped,
        scrubbed: true,
      });

      return { index: slice.index, scenario };
    };

    const captured = (
      await mapWithConcurrency(slices, SYNTHTRACE_CAPTURE_SLICE_CONCURRENCY, captureSlice)
    )
      .filter((result): result is { index: number; scenario: string } => result !== null)
      .sort((a, b) => a.index - b.index);

    if (captured.length === 0) {
      throw Boom.notFound('No APM documents found for the current time range and filters.');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // A single non-empty slice (the common case for narrow ranges) downloads as a plain .ts.
    if (captured.length === 1) {
      return { scenario: captured[0].scenario, filename: `apm_capture_${timestamp}.ts` };
    }

    // Multiple slices: bundle each as its own scenario file in a zip, keeping the combined size
    // bounded so a hyper-dense multi-day capture can't OOM the response or produce a huge archive.
    const zip = new AdmZip();
    let totalBytes = 0;
    let droppedSlices = 0;
    const partNames: string[] = [];
    for (const { scenario } of captured) {
      const bytes = Buffer.byteLength(scenario, 'utf8');
      if (totalBytes + bytes > SYNTHTRACE_CAPTURE_MAX_TOTAL_BYTES && partNames.length > 0) {
        droppedSlices++;
        continue;
      }
      totalBytes += bytes;
      const partName = `apm_capture_part-${String(partNames.length + 1).padStart(3, '0')}.ts`;
      partNames.push(partName);
      zip.addFile(partName, Buffer.from(scenario, 'utf8'));
    }

    zip.addFile(
      'README.txt',
      Buffer.from(buildCaptureReadmeText({ partNames, droppedSlices }), 'utf8')
    );

    return { zipBase64: zip.toBuffer().toString('base64'), filename: `apm_capture_${timestamp}.zip` };
  },
});

/**
 * Human-readable replay instructions bundled into the capture zip. Each part is a self-contained,
 * deterministic scenario anchored to absolute timestamps; replaying them all reconstructs the
 * full capture. Only the first run uses `--clean` (which wipes existing synthtrace data); the
 * rest append.
 */
function buildCaptureReadmeText({
  partNames,
  droppedSlices,
}: {
  partNames: string[];
  droppedSlices: number;
}): string {
  const [first] = partNames;
  return [
    'APM synthtrace capture',
    '======================',
    '',
    `This archive contains ${partNames.length} scenario file(s), each covering a slice of the`,
    'captured time range. They are independent @kbn/synthtrace scenarios; replay them all to',
    'reconstruct the full capture. Only the FIRST run should use --clean (it wipes existing',
    'synthtrace data); the rest append.',
    '',
    'BABEL_DISABLE_CACHE=1 avoids @babel/register accumulating a multi-MB on-disk transpile cache',
    "across the runs (which otherwise logs a harmless \"Cache too large\" RangeError); it doesn't",
    'affect the ingested data.',
    '',
    'From the Kibana repo root:',
    '',
    `  BABEL_DISABLE_CACHE=1 node scripts/synthtrace ${first ?? 'apm_capture_part-001.ts'} --clean`,
    '  for f in apm_capture_part-*.ts; do',
    `    [ "$f" = "${first ?? 'apm_capture_part-001.ts'}" ] && continue`,
    '    BABEL_DISABLE_CACHE=1 node scripts/synthtrace "$f"',
    '  done',
    '',
    'Each file anchors its events to absolute timestamps, so set your Kibana time range to the',
    'captured window (shown in each file header) to see the data.',
    ...(droppedSlices > 0
      ? [
          '',
          `NOTE: ${droppedSlices} slice(s) were omitted because the capture exceeded the maximum`,
          'archive size. Narrow the time range to capture them.',
        ]
      : []),
    '',
  ].join('\n');
}

export const traceRouteRepository = {
  ...unifiedTracesByIdRoute,
  ...tracesRoute,
  ...rootTransactionByTraceIdRoute,
  ...rootItemByTraceIdRoute,
  ...transactionByIdRoute,
  ...transactionFromTraceByIdRoute,
  ...spanFromTraceByIdRoute,
  ...transactionByNameRoute,
  ...unifiedTracesByIdSummaryRoute,
  ...unifiedTracesByIdErrorsRoute,
  ...unifiedTraceSpanRoute,
  ...synthtraceScenarioRoute,
};
