/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseCallbackHandlerInput, BaseTracer, Run } from 'langchain/callbacks';
import agent from 'elastic-apm-node';
import type { Logger } from '@kbn/core/server';

export interface LangChainTracerFields extends BaseCallbackHandlerInput {
  exampleId?: string;
  projectName?: string;
}

type Span = Exclude<typeof agent.currentSpan, undefined | null>;

/**
 * APMTracer is a tracer that uses the Elastic APM agent to trace langchain retrievers, llms, chains, and tools.
 */
export class APMTracer extends BaseTracer implements LangChainTracerFields {
  name = 'apm_tracer';
  projectName?: string;
  exampleId?: string;
  logger: Logger;

  retrieverSpans: Span[] = [];
  llmSpans: Span[] = [];
  chainSpans: Span[] = [];
  toolSpans: Span[] = [];

  constructor(fields: LangChainTracerFields = {}, logger: Logger) {
    super(fields);
    const { exampleId, projectName } = fields;

    this.projectName = projectName ?? 'default';
    this.exampleId = exampleId;
    this.logger = logger;
  }

  protected async persistRun(_run: Run): Promise<void> {}

  protected _getLabelsFromRun(run: Run): agent.Labels {
    return {
      ...(run.tags?.reduce((acc, t) => ({ ...acc, [t]: t }), {}) ?? {}),
      ...(run.outputs ?? {}),
      ...(run.events?.reduce((acc, e) => ({ ...acc, ...e }), {}) ?? {}),
      ...run.inputs,
    };
  }

  protected createAndAddSpanFromRun(run: Run, spans: Span[]) {
    const span = agent.startSpan(run.name) ?? undefined;

    if (span) {
      span.addLabels(this._getLabelsFromRun(run));
      spans.push(span);
    }
  }

  async onRetrieverStart(run: Run): Promise<void> {
    this.logger.debug(`onRetrieverStart: run:\n${JSON.stringify(run, null, 2)}`);
    this.createAndAddSpanFromRun(run, this.retrieverSpans);
  }

  async onRetrieverEnd(run: Run): Promise<void> {
    this.logger.debug(`onRetrieverEnd: run:\n${JSON.stringify(run, null, 2)}`);
    this.retrieverSpans.pop()?.end();
  }

  async onRetrieverError(run: Run): Promise<void> {
    this.logger.debug(`onRetrieverError: run:\n${JSON.stringify(run, null, 2)}`);
  }

  async onLLMStart(run: Run): Promise<void> {
    this.logger.debug(`onLLMStart: run:\n${JSON.stringify(run, null, 2)}`);
    this.createAndAddSpanFromRun(run, this.llmSpans);
  }

  async onLLMEnd(run: Run): Promise<void> {
    this.logger.debug(`onLLMEnd: run:\n${JSON.stringify(run, null, 2)}`);
    this.llmSpans.pop()?.end();
  }

  async onLLMError(run: Run): Promise<void> {
    this.logger.debug(`onLLMError: run:\n${JSON.stringify(run, null, 2)}`);
  }

  async onChainStart(run: Run): Promise<void> {
    this.logger.debug(`onChainStart: run:\n${JSON.stringify(run, null, 2)}`);
    this.createAndAddSpanFromRun(run, this.chainSpans);
  }

  async onChainEnd(run: Run): Promise<void> {
    this.logger.debug(`onChainEnd: run:\n${JSON.stringify(run, null, 2)}`);
    this.chainSpans.pop()?.end();
  }

  async onChainError(run: Run): Promise<void> {
    this.logger.debug(`onChainError: run:\n${JSON.stringify(run, null, 2)}`);
  }

  async onToolStart(run: Run): Promise<void> {
    this.logger.debug(`onToolStart: run:\n${JSON.stringify(run, null, 2)}`);
    this.createAndAddSpanFromRun(run, this.toolSpans);
  }

  async onToolEnd(run: Run): Promise<void> {
    this.logger.debug(`onToolEnd: run:\n${JSON.stringify(run, null, 2)}`);
    this.toolSpans.pop()?.end();
  }

  async onToolError(run: Run): Promise<void> {
    this.logger.debug(`onToolError: run:\n${JSON.stringify(run, null, 2)}`);
  }
}
