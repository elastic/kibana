/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';
import {
  METRICS_ENVIRONMENT,
  SERVICE_METRICS_JAVA_APM,
  SERVICE_METRICS_NODEJS_APM,
  SERVICE_METRICS_RUBY_JRUBY,
  SERVICE_METRICS_EDOT_JAVA,
  SERVICE_METRICS_EDOT_NODEJS,
  SERVICE_METRICS_EDOT_DOTNET_V9,
  SERVICE_METRICS_EDOT_DOTNET_V8,
  SERVICE_METRICS_OTEL_JAVA,
  SERVICE_METRICS_OTEL_NODEJS,
  SERVICE_METRICS_OTEL_DOTNET,
  SERVICE_METRICS_OTEL_GO,
  SERVICE_METRICS_OTEL_NATIVE_EDOT_JAVA,
  SERVICE_METRICS_OTEL_NATIVE_EDOT_NODEJS,
  SERVICE_METRICS_OTEL_NATIVE_EDOT_PYTHON,
  SERVICE_METRICS_OTEL_NATIVE_OTEL_JAVA,
  SERVICE_METRICS_OTEL_NATIVE_OTEL_NODEJS,
  SERVICE_METRICS_OTEL_NATIVE_OTEL_PYTHON,
  SERVICE_METRICS_OTEL_NATIVE_OTEL_GO,
} from '../constants';

interface ServiceConfig {
  name: string;
  agentName: string;
  runtimeVersion?: string;
  telemetrySdkName?: string;
  telemetrySdkLanguage?: string;
  runtimeName?: string;
  extraMetrics?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const SYSTEM_METRICS: Record<string, unknown> = {
  'system.cpu.total.norm.pct': 0.4,
  'system.process.cpu.total.norm.pct': 0.2,
  'system.memory.actual.free': 2_000_000_000,
  'system.memory.total': 8_000_000_000,
  'system.process.memory.rss.bytes': 500_000_000,
};

const JAVA_APM_METRICS: Record<string, unknown> = {
  ...SYSTEM_METRICS,
  'jvm.memory.heap.used': 300_000_000,
  'jvm.memory.heap.max': 512_000_000,
  'jvm.memory.heap.committed': 400_000_000,
  'jvm.memory.heap.pool.used': 200_000_000,
  'jvm.memory.heap.pool.max': 256_000_000,
  'jvm.memory.heap.pool.committed': 250_000_000,
  'jvm.memory.non_heap.used': 100_000_000,
  'jvm.memory.non_heap.committed': 120_000_000,
  'jvm.thread.count': 42,
  'jvm.gc.time': 150,
  'jvm.gc.count': 10,
  'jvm.gc.alloc': 50_000_000,
  'labels.name': 'G1 Old Gen',
};

const NODEJS_APM_METRICS: Record<string, unknown> = {
  ...SYSTEM_METRICS,
  'nodejs.eventloop.delay.avg.ms': 1.5,
  'nodejs.handles.active': 12,
  'nodejs.requests.active': 3,
  'nodejs.memory.heap.allocated.bytes': 50_000_000,
  'nodejs.memory.heap.used.bytes': 30_000_000,
  'nodejs.memory.external.bytes': 5_000_000,
  'nodejs.memory.arrayBuffers.bytes': 2_000_000,
};

const OTEL_JAVA_HEAP_METRICS: Record<string, unknown> = {
  'jvm.cpu.recent_utilization': 0.3,
  'jvm.system.cpu.utilization': 0.5,
  'jvm.memory.committed': 400_000_000,
  'jvm.memory.limit': 512_000_000,
  'jvm.memory.used': 300_000_000,
  'jvm.thread.count': 42,
  'labels.jvm_memory_pool_name': 'G1 Old Gen',
  'labels.jvm_memory_type': 'heap',
};

const OTEL_JAVA_NON_HEAP_METRICS: Record<string, unknown> = {
  'jvm.cpu.recent_utilization': 0.3,
  'jvm.system.cpu.utilization': 0.5,
  'jvm.memory.committed': 120_000_000,
  'jvm.memory.limit': 256_000_000,
  'jvm.memory.used': 100_000_000,
  'jvm.thread.count': 42,
  'labels.jvm_memory_pool_name': 'Metaspace',
  'labels.jvm_memory_type': 'non_heap',
};

const OTEL_NODEJS_METRICS: Record<string, unknown> = {
  'nodejs.eventloop.delay.p50': 1.2,
  'nodejs.eventloop.delay.p90': 3.5,
  'nodejs.eventloop.utilization': 0.15,
  'process.cpu.utilization': 0.25,
  'process.memory.usage': 100_000_000,
};

const OTEL_DOTNET_METRICS: Record<string, unknown> = {
  'process.memory.usage': 150_000_000,
  'process.runtime.dotnet.gc.collections.count': 25,
  'process.runtime.dotnet.gc.heap.size': 80_000_000,
  'process.runtime.dotnet.thread_pool.threads.count': 10,
};

const OTEL_NATIVE_EDOT_JAVA_METRICS: Record<string, unknown> = {
  'jvm.cpu.recent_utilization': 0.3,
  'jvm.system.cpu.utilization': 0.5,
  'jvm.memory.used': 300_000_000,
  'jvm.memory.limit': 512_000_000,
  'jvm.memory.committed': 400_000_000,
  'jvm.memory.used_after_last_gc': 250_000_000,
  'jvm.memory.type': 'heap',
  'jvm.memory.pool.name': 'G1 Old Gen',
  'jvm.thread.count': 42,
  'jvm.thread.state': 'runnable',
  'jvm.thread.daemon': true,
  'jvm.class.count': 8500,
  'jvm.gc.action': 'end of major GC',
  'jvm.gc.name': 'G1 Old Generation',
};

const OTEL_NATIVE_OTHER_JAVA_METRICS: Record<string, unknown> = {
  'jvm.cpu.recent_utilization': 0.3,
  'jvm.memory.used': 300_000_000,
  'jvm.memory.limit': 512_000_000,
  'jvm.memory.committed': 400_000_000,
  'jvm.memory.used_after_last_gc': 250_000_000,
  'jvm.memory.type': 'heap',
  'jvm.memory.pool.name': 'G1 Old Gen',
  'jvm.thread.count': 42,
  'jvm.thread.state': 'runnable',
  'jvm.thread.daemon': true,
  'jvm.class.count': 8500,
};

const OTEL_PYTHON_METRICS: Record<string, unknown> = {
  'cpython.gc.collected_objects': 500,
  'cpython.gc.collections': 20,
  'cpython.gc.uncollectable_objects': 0,
  'process.runtime.cpython.memory': 80_000_000,
};

const OTEL_GO_METRICS: Record<string, unknown> = {
  'go.goroutine.count': 50,
  'go.memory.allocated': 30_000_000,
  'go.memory.allocations': 100_000,
  'go.memory.gc.goal': 60_000_000,
  'go.memory.used': 45_000_000,
  'go.processor.limit': 8,
};

const METRIC_SERVICES: ServiceConfig[] = [
  // classic_apm-apm-java
  { name: SERVICE_METRICS_JAVA_APM, agentName: 'java', extraMetrics: JAVA_APM_METRICS },
  // classic_apm-apm-nodejs
  { name: SERVICE_METRICS_NODEJS_APM, agentName: 'nodejs', extraMetrics: NODEJS_APM_METRICS },
  // classic_apm-edot-java
  {
    name: SERVICE_METRICS_EDOT_JAVA,
    agentName: 'opentelemetry/java/elastic',
    extraMetrics: [OTEL_JAVA_HEAP_METRICS, OTEL_JAVA_NON_HEAP_METRICS],
  },
  // classic_apm-edot-nodejs
  {
    name: SERVICE_METRICS_EDOT_NODEJS,
    agentName: 'opentelemetry/nodejs/elastic',
    extraMetrics: OTEL_NODEJS_METRICS,
  },
  // classic_apm-edot-dotnet (v9 falls through to default)
  {
    name: SERVICE_METRICS_EDOT_DOTNET_V9,
    agentName: 'opentelemetry/dotnet/elastic',
    runtimeVersion: '9.0.0',
    extraMetrics: OTEL_DOTNET_METRICS,
  },
  // classic_apm-edot-dotnet-lte-v8
  {
    name: SERVICE_METRICS_EDOT_DOTNET_V8,
    agentName: 'opentelemetry/dotnet/elastic',
    runtimeVersion: '8.0.11',
    extraMetrics: OTEL_DOTNET_METRICS,
  },
  // classic_apm-otel_other-java
  {
    name: SERVICE_METRICS_OTEL_JAVA,
    agentName: 'opentelemetry/java',
    extraMetrics: [OTEL_JAVA_HEAP_METRICS, OTEL_JAVA_NON_HEAP_METRICS],
  },
  // classic_apm-otel_other-nodejs
  {
    name: SERVICE_METRICS_OTEL_NODEJS,
    agentName: 'opentelemetry/nodejs',
    extraMetrics: OTEL_NODEJS_METRICS,
  },
  // classic_apm-otel_other-dotnet
  {
    name: SERVICE_METRICS_OTEL_DOTNET,
    agentName: 'opentelemetry/dotnet',
    extraMetrics: OTEL_DOTNET_METRICS,
  },
  // classic_apm-otel_other-go
  {
    name: SERVICE_METRICS_OTEL_GO,
    agentName: 'opentelemetry/go',
    extraMetrics: OTEL_GO_METRICS,
  },
  // otel_native-edot-java
  {
    name: SERVICE_METRICS_OTEL_NATIVE_EDOT_JAVA,
    agentName: 'opentelemetry/java/elastic',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'java',
    extraMetrics: OTEL_NATIVE_EDOT_JAVA_METRICS,
  },
  // otel_native-edot-nodejs
  {
    name: SERVICE_METRICS_OTEL_NATIVE_EDOT_NODEJS,
    agentName: 'opentelemetry/nodejs/elastic',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'nodejs',
    extraMetrics: OTEL_NODEJS_METRICS,
  },
  // otel_native-edot-python
  {
    name: SERVICE_METRICS_OTEL_NATIVE_EDOT_PYTHON,
    agentName: 'opentelemetry/python/elastic',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'python',
    extraMetrics: OTEL_PYTHON_METRICS,
  },
  // otel_native-otel_other-java
  {
    name: SERVICE_METRICS_OTEL_NATIVE_OTEL_JAVA,
    agentName: 'opentelemetry/java',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'java',
    extraMetrics: OTEL_NATIVE_OTHER_JAVA_METRICS,
  },
  // otel_native-otel_other-nodejs
  {
    name: SERVICE_METRICS_OTEL_NATIVE_OTEL_NODEJS,
    agentName: 'opentelemetry/nodejs',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'nodejs',
    extraMetrics: OTEL_NODEJS_METRICS,
  },
  // otel_native-otel_other-python
  {
    name: SERVICE_METRICS_OTEL_NATIVE_OTEL_PYTHON,
    agentName: 'opentelemetry/python',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'python',
    extraMetrics: OTEL_PYTHON_METRICS,
  },
  // otel_native-otel_other-go
  {
    name: SERVICE_METRICS_OTEL_NATIVE_OTEL_GO,
    agentName: 'opentelemetry/go',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'go',
    extraMetrics: OTEL_GO_METRICS,
  },
  // Non-dashboard: JRuby (triggers JvmMetricsOverview)
  {
    name: SERVICE_METRICS_RUBY_JRUBY,
    agentName: 'ruby',
    runtimeName: 'jruby',
    extraMetrics: {
      ...SYSTEM_METRICS,
      'jvm.memory.heap.used': 200_000_000,
      'jvm.memory.heap.max': 512_000_000,
      'jvm.memory.non_heap.used': 80_000_000,
      'jvm.thread.count': 30,
      'jvm.gc.time': 100,
      'jvm.gc.count': 5,
    },
  },
];

export function metricsServices({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const range = timerange(from, to);

  const instances = METRIC_SERVICES.map((config) => {
    const instance = apm
      .service({
        name: config.name,
        environment: METRICS_ENVIRONMENT,
        agentName: config.agentName,
      })
      .instance(`${config.name}-instance`);

    const fields = instance.fields as Record<string, unknown>;

    if (config.runtimeVersion) {
      fields['service.runtime.version'] = config.runtimeVersion;
    }
    if (config.runtimeName) {
      fields['service.runtime.name'] = config.runtimeName;
    }
    if (config.telemetrySdkName) {
      fields['telemetry.sdk.name'] = config.telemetrySdkName;
    }
    if (config.telemetrySdkLanguage) {
      fields['telemetry.sdk.language'] = config.telemetrySdkLanguage;
    }

    return { instance, config };
  });

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      instances.flatMap(({ instance, config }) => {
        const baseMetrics = {
          'system.cpu.total.norm.pct': 0.4,
          'system.memory.actual.free': 2_000_000_000,
          'system.memory.total': 8_000_000_000,
        };

        const extraList = Array.isArray(config.extraMetrics)
          ? config.extraMetrics
          : config.extraMetrics
          ? [config.extraMetrics]
          : [{}];

        const metricsets = extraList.map((extra) => {
          const metricset = instance.appMetrics(baseMetrics).timestamp(timestamp);
          Object.assign(metricset.fields, extra);
          return metricset;
        });

        return [
          instance
            .transaction({ transactionName: 'GET /api/metrics' })
            .timestamp(timestamp)
            .duration(200)
            .success(),
          ...metricsets,
        ];
      })
    );
}
