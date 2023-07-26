/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type {
  ChatCompletionRequestMessage,
  CreateChatCompletionResponse,
  CreateChatCompletionResponseChoicesInner,
} from 'openai';
import { LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-plugin/common';
import { CoPilotPromptId } from '.';

const PERF_GPT_SYSTEM_MESSAGE = {
  content: `You are perf-gpt, a helpful assistant for performance analysis and optimisation
    of software. Answer as concisely as possible.`,
  role: 'system' as const,
};

const APM_GPT_SYSTEM_MESSAGE = {
  content: `You are apm-gpt, a helpful assistant for performance analysis, optimisation and
    root cause analysis of software. Answer as concisely as possible.`,
  role: 'system' as const,
};

const LOGS_SYSTEM_MESSAGE = {
  content: `You are logs-gpt, a helpful assistant for logs-based observability. Answer as
    concisely as possible.`,
  role: 'system' as const,
};

const INFRA_SYSTEM_MESSAGE = {
  content: `You are infra-gpt, a helpful assistant for metrics-based infrastructure observability. Answer as
    concisely as possible.`,
  role: 'system' as const,
};

function prompt<TParams extends t.Type<any, any, any>>({
  params,
  messages,
}: {
  params: TParams;
  messages: (params: t.OutputOf<TParams>) => ChatCompletionRequestMessage[];
}) {
  return {
    params,
    messages,
  };
}

const logEntryRt = t.type({
  fields: t.array(
    t.type({
      field: t.string,
      value: t.array(t.any),
    })
  ),
});

const logRateAnalysisTypeRt = t.union([
  t.literal(LOG_RATE_ANALYSIS_TYPE.SPIKE),
  t.literal(LOG_RATE_ANALYSIS_TYPE.DIP),
]);
const logRateAnalysisSignificantFieldValuesRt = t.array(
  t.type({
    field: t.string,
    value: t.union([t.string, t.number]),
    docCount: t.number,
    pValue: t.union([t.number, t.null]),
  })
);

export const coPilotPrompts = {
  [CoPilotPromptId.ProfilingOptimizeFunction]: prompt({
    params: t.type({
      library: t.string,
      functionName: t.string,
    }),
    messages: ({ library, functionName }) => {
      return [
        PERF_GPT_SYSTEM_MESSAGE,
        {
          content: `I am a software engineer. I am trying to understand what a function in a particular
          software library does.

          The library is: ${library}
          The function is: ${functionName}

          Your have two tasks. Your first task is to desribe what the library is and what its use cases are, and to
          describe what the function does. The output format should look as follows:

          Library description: Provide a concise description of the library
          Library use-cases: Provide a concise description of what the library is typically used for.
          Function description: Provide a concise, technical, description of what the function does.

          Assume the function ${functionName} from the library ${library} is consuming significant CPU resources.
          Your second task is to suggest ways to optimize or improve the system that involve the ${functionName} function from the
          ${library} library. Types of improvements that would be useful to me are improvements that result in:

          - Higher performance so that the system runs faster or uses less CPU
          - Better memory efficient so that the system uses less RAM
          - Better storage efficient so that the system stores less data on disk.
          - Better network I/O efficiency so that less data is sent over the network
          - Better disk I/O efficiency so that less data is read and written from disk

          Make up to five suggestions. Your suggestions must meet all of the following criteria:
          1. Your suggestions should detailed, technical and include concrete examples.
          2. Your suggestions should be specific to improving performance of a system in which the ${functionName} function from
          the ${library} library is consuming significant CPU.
          3. If you suggest replacing the function or library with a more efficient replacement you must suggest at least
          one concrete replacement.

          If you know of fewer than five ways to improve the performance of a system in which the ${functionName} function from the
          ${library} library is consuming significant CPU, then provide fewer than five suggestions. If you do not know of any
          way in which to improve the performance then say "I do not know how to improve the performance of systems where
          this function is consuming a significant amount of CPU".

          Do not suggest using a CPU profiler. I have already profiled my code. The profiler I used is Elastic Universal Profiler.
          If there is specific information I should look for in the profiler output then tell me what information to look for
          in the output of Elastic Universal Profiler.

          You must not include URLs, web addresses or websites of any kind in your output.

          If you have suggestions, the output format should look as follows:

          Here are some suggestions as to how you might optimize your system if ${functionName} in ${library} is consuming
          significant CPU resources:
          1. Insert first suggestion
          2. Insert second suggestion`,
          role: 'user',
        },
      ];
    },
  }),
  [CoPilotPromptId.ApmExplainError]: prompt({
    params: t.intersection([
      t.type({
        serviceName: t.string,
        languageName: t.string,
        runtimeName: t.string,
        runtimeVersion: t.string,
        transactionName: t.string,
        logStacktrace: t.string,
        exceptionStacktrace: t.string,
      }),
      t.partial({
        spanName: t.string,
      }),
    ]),
    messages: ({
      serviceName,
      languageName,
      runtimeName,
      runtimeVersion,
      transactionName,
      logStacktrace,
      exceptionStacktrace,
    }) => {
      return [
        APM_GPT_SYSTEM_MESSAGE,
        {
          content: `I'm an SRE. I am looking at an exception and trying to understand what it means.

          Your task is to describe what the error means and what it could be caused by.

          The error occurred on a service called ${serviceName}, which is a ${runtimeName} service written in ${languageName}. The
          runtime version is ${runtimeVersion}.

          The request it occurred for is called ${transactionName}.

          ${
            logStacktrace
              ? `The log stacktrace:
          ${logStacktrace}`
              : ''
          }

          ${
            exceptionStacktrace
              ? `The exception stacktrace:
          ${exceptionStacktrace}`
              : ''
          }
          `,
          role: 'user',
        },
      ];
    },
  }),
  [CoPilotPromptId.LogsExplainMessage]: prompt({
    params: t.type({
      logEntry: logEntryRt,
    }),
    messages: ({ logEntry }) => {
      return [
        LOGS_SYSTEM_MESSAGE,
        {
          content: `I'm looking at a log entry. Can you explain me what the log message means? Where it could be coming from, whether it is expected and whether it is an issue. Here's the context, serialized: ${JSON.stringify(
            logEntry
          )} `,
          role: 'user',
        },
      ];
    },
  }),
  [CoPilotPromptId.LogsFindSimilar]: prompt({
    params: t.type({
      logEntry: logEntryRt,
    }),
    messages: ({ logEntry }) => {
      const message = logEntry.fields.find((field) => field.field === 'message')?.value[0];
      return [
        LOGS_SYSTEM_MESSAGE,
        {
          content: `I'm looking at a log entry. Can you construct a Kibana KQL query that I can enter in the search bar that gives me similar log entries, based on the \`message\` field: ${message}`,
          role: 'user',
        },
      ];
    },
  }),
  [CoPilotPromptId.InfraExplainProcess]: prompt({
    params: t.type({
      command: t.string,
    }),
    messages: ({ command }) => {
      return [
        INFRA_SYSTEM_MESSAGE,
        {
          content: `I am a software engineer. I am trying to understand what a process running on my
          machine does.

          Your task is to first describe what the process is and what its general use cases are. If I also provide you
          with the arguments to the process you should then explain its arguments and how they influence the behaviour
          of the process. If I do not provide any arguments then explain the behaviour of the process when no arguments are
          provided.

          If you do not recognise the process say "No information available for this process". If I provide an argument
          to the process that you do not recognise then say "No information available for this argument" when explaining
          that argument.

          Here is an example with arguments.
          Process: metricbeat -c /etc/metricbeat.yml -d autodiscover,kafka -e -system.hostfs=/hostfs
          Explanation: Metricbeat is part of the Elastic Stack. It is a lightweight shipper that you can install on your
          servers to periodically collect metrics from the operating system and from services running on the server.
          Use cases for Metricbeat generally revolve around infrastructure monitoring. You would typically install
          Metricbeat on your servers to collect metrics from your systems and services. These metrics are then
          used for performance monitoring, anomaly detection, system status checks, etc.

          Here is a breakdown of the arguments used:

          * -c /etc/metricbeat.yml: The -c option is used to specify the configuration file for Metricbeat. In
          this case, /etc/metricbeat.yml is the configuration file. This file contains configurations for what
          metrics to collect and where to send them (e.g., to Elasticsearch or Logstash).

          * -d autodiscover,kafka: The -d option is used to enable debug output for selected components. In
          this case, debug output is enabled for autodiscover and kafka components. The autodiscover feature
          allows Metricbeat to automatically discover services as they get started and stopped in your environment,
          and kafka is presumably a monitored service from which Metricbeat collects metrics.

          * -e: The -e option is used to log to stderr and disable syslog/file output. This is useful for debugging.

          * -system.hostfs=/hostfs: The -system.hostfs option is used to set the mount point of the host’s
          filesystem for use in monitoring a host from within a container. In this case, /hostfs is the mount
          point. When running Metricbeat inside a container, filesystem metrics would be for the container by
          default, but with this option, Metricbeat can get metrics for the host system.

          Here is an example without arguments.
          Process: metricbeat
          Explanation: Metricbeat is part of the Elastic Stack. It is a lightweight shipper that you can install on your
          servers to periodically collect metrics from the operating system and from services running on the server.
          Use cases for Metricbeat generally revolve around infrastructure monitoring. You would typically install
          Metricbeat on your servers to collect metrics from your systems and services. These metrics are then
          used for performance monitoring, anomaly detection, system status checks, etc.

          Running it without any arguments will start the process with the default configuration file, typically
          located at /etc/metricbeat/metricbeat.yml. This file specifies the metrics to be collected and where
          to ship them to.

          Now explain this process to me.
          Process: ${command}
          Explanation:
            `,
          role: 'user',
        },
      ];
    },
  }),
  [CoPilotPromptId.LogRateAnalysis]: prompt({
    params: t.type({
      analysisType: logRateAnalysisTypeRt,
      significantFieldValues: logRateAnalysisSignificantFieldValuesRt,
    }),
    messages: ({ analysisType, significantFieldValues }) => {
      const header = 'Field name,Field value,Doc count,p-value';
      const rows = significantFieldValues.map((item) => Object.values(item).join(',')).join('\n');

      const content = `You are an observability expert using Elastic Observability Suite on call being consulted about a log threshold alert that got triggered by a ${analysisType} in log messages. Your job is to take immediate action and proceed with both urgency and precision.
      "Log Rate Analysis" is an AIOps feature that uses advanced statistical methods to identify reasons for increases and decreases in log rates. It makes it easy to find and investigate causes of unusual spikes or dips by using the analysis workflow view.
      You are using "Log Rate Analysis" and ran the statistical analysis on the log messages which occured during the alert.
      You received the following analysis results from "Log Rate Analysis" which list statistically significant co-occuring field/value combinations sorted from most significant (lower p-values) to least significant (higher p-values) that contribute to the log messages ${analysisType}:

      ${header}
      ${rows}

      Based on the above analysis results and your observability expert knowledge, output the following:
      Analyse the type of these logs and explain their usual purpose (1 paragraph).
      Based on the type of these logs do a root cause analysis on why the field and value combinations from the anlaysis results are causing this ${analysisType} in logs (2 parapraphs).
      Recommend concrete remediations to resolve the root cause (3 bullet points).
      Do not repeat the given instructions in your output.`;

      return [
        LOGS_SYSTEM_MESSAGE,
        {
          content,
          role: 'user',
        },
      ];
    },
  }),
};

export type CoPilotPromptMap = typeof coPilotPrompts;

export type PromptParamsOf<TPromptId extends CoPilotPromptId> = t.OutputOf<
  {
    [TKey in keyof CoPilotPromptMap]: CoPilotPromptMap[TKey];
  }[TPromptId]['params']
>;

export type CreateChatCompletionResponseChunk = Omit<CreateChatCompletionResponse, 'choices'> & {
  choices: Array<
    Omit<CreateChatCompletionResponseChoicesInner, 'message'> & {
      delta: { content?: string };
    }
  >;
};
