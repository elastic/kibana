/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { remove } from 'lodash';
import { lastValueFrom } from 'rxjs';
import type { OutputAPI } from '../../common/output';
import { withoutOutputUpdateEvents } from '../../common/output/without_output_update_events';
import type { EvaluationResult } from './types';

export interface InferenceEvaluationClient {
  getEvaluationConnectorId: () => string;
  evaluate: (options: {
    input: string;
    criteria?: string[];
    system?: string;
  }) => Promise<EvaluationResult>;
  getResults: () => EvaluationResult[];
  onResult: (cb: (result: EvaluationResult) => void) => () => void;
  output: OutputAPI;
}

export function createInferenceEvaluationClient({
  connectorId,
  evaluationConnectorId,
  suite,
  outputApi,
}: {
  connectorId: string;
  evaluationConnectorId: string;
  suite?: Mocha.Suite;
  outputApi: OutputAPI;
}): InferenceEvaluationClient {
  let currentTitle: string = '';
  let firstSuiteName: string = '';

  // get the suite name
  if (suite) {
    suite.beforeEach(function () {
      const currentTest: Mocha.Test = this.currentTest!;
      const titles: string[] = [];
      titles.push(this.currentTest!.title);
      let parent = currentTest.parent;
      while (parent) {
        titles.push(parent.title);
        parent = parent.parent;
      }
      currentTitle = titles.reverse().join(' ');
      firstSuiteName = titles.filter((item) => item !== '')[0];
    });

    suite.afterEach(function () {
      currentTitle = '';
    });
  }

  const onResultCallbacks: Array<{
    callback: (result: EvaluationResult) => void;
    unregister: () => void;
  }> = [];

  const results: EvaluationResult[] = [];

  return {
    output: outputApi,
    getEvaluationConnectorId: () => evaluationConnectorId,
    evaluate: async ({ input, criteria = [], system }) => {
      const evaluation = await lastValueFrom(
        outputApi('evaluate', {
          connectorId,
          system: withAdditionalSystemContext(
            `You are a helpful, respected assistant for evaluating task
            inputs and outputs in the Elastic Platform.

            Your goal is to verify whether the output of a task
            succeeded, given the criteria.

            For each criterion, calculate a *score* between 0 (criterion fully failed)
            and 1 (criterion fully succeeded), Fractional results (e.g. 0.5) are allowed,
            if only part of the criterion succeeded. Explain your *reasoning* for the score, by
            describing what the assistant did right, and describing and
            quoting what the assistant did wrong, where it could improve,
            and what the root cause was in case of a failure.
            `,
            system
          ),

          input: `
            ## Criteria

            ${criteria
              .map((criterion, index) => {
                return `${index}: ${criterion}`;
              })
              .join('\n')}

            ## Input

            ${input}`,
          schema: {
            type: 'object',
            properties: {
              criteria: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    index: {
                      type: 'number',
                      description: 'The number of the criterion',
                    },
                    score: {
                      type: 'number',
                      description:
                        'The score you calculated for the criterion, between 0 (criterion fully failed) and 1 (criterion fully succeeded).',
                    },
                    reasoning: {
                      type: 'string',
                      description:
                        'Your reasoning for the score. Explain your score by mentioning what you expected to happen and what did happen.',
                    },
                  },
                  required: ['index', 'score', 'reasoning'],
                },
              },
            },
            required: ['criteria'],
          } as const,
        }).pipe(withoutOutputUpdateEvents())
      );

      const scoredCriteria = evaluation.output.criteria;

      const scores = scoredCriteria.map(({ index, score, reasoning }) => {
        return {
          criterion: criteria[index],
          score,
          reasoning,
        };
      });

      const result: EvaluationResult = {
        name: currentTitle,
        category: firstSuiteName,
        input,
        passed: scoredCriteria.every(({ score }) => score >= 1),
        scores,
      };

      results.push(result);

      onResultCallbacks.forEach(({ callback }) => {
        callback(result);
      });

      return result;
    },
    getResults: () => results,
    onResult: (callback) => {
      const unregister = () => {
        remove(onResultCallbacks, { callback });
      };
      onResultCallbacks.push({ callback, unregister });
      return unregister;
    },
  };
}

const withAdditionalSystemContext = (system: string, additionalContext?: string): string => {
  if (!additionalContext) {
    return system;
  }

  return [
    system,
    `Here is some additional context that should help you for your evaluation:` + additionalContext,
  ].join('\n\n');
};
