/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '@kbn/observability-ai-assistant-plugin/public';

const USER_QUESTION =
  "I'm missing data in APM — how do I instrument my services with the managed OTLP endpoint on serverless?";

function getAssistantAnswer({
  onboardingUrl,
  docsUrl,
}: {
  onboardingUrl: string;
  docsUrl: string;
}): string {
  return `Here's how to start sending application data to Elastic via the **managed OTLP endpoint** on serverless:

1. **Open the OpenTelemetry onboarding flow.** Go to the [OpenTelemetry APM onboarding](${onboardingUrl}) page. It provisions everything you need automatically.
2. **Copy your credentials.** The flow generates an **API key** and your **managed OTLP endpoint URL** — no collector to host or manage yourself.
3. **Configure your OpenTelemetry SDK / exporter.** Point the OTLP exporter at the managed OTLP URL and set the \`Authorization\` header to your API key. Send logs, metrics, and traces to that endpoint.
4. **Verify data is flowing.** Once your service emits telemetry, return to **APM → Services** — your service should appear within a minute or two.

You can read more in the [managed OTLP endpoint documentation](${docsUrl}).

Want me to walk you through configuring the exporter for a specific language (Node.js, Java, Python, Go, ...)? Just tell me which one.`;
}

/**
 * Builds the messages used to pre-fill the Observability AI Assistant conversation
 * opened from the "Do you miss some data?" callout. We prefill both the user question
 * and a ready-made assistant answer so the chat opens with actionable guidance
 * (predefined conversations are displayed but not auto-sent to the LLM).
 */
export function getMissingDataAssistantMessages({
  onboardingUrl,
  docsUrl,
}: {
  onboardingUrl: string;
  docsUrl: string;
}): Message[] {
  const now = new Date().toISOString();

  return [
    {
      '@timestamp': now,
      message: {
        role: 'user' as Message['message']['role'],
        content: USER_QUESTION,
      },
    },
    {
      '@timestamp': now,
      message: {
        role: 'assistant' as Message['message']['role'],
        content: getAssistantAnswer({ onboardingUrl, docsUrl }),
      },
    },
  ];
}
