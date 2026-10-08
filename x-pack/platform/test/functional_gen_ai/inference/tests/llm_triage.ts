/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LlmSmokeFailureEvidence,
  LlmSmokeFailureJudgement,
} from '@kbn/gen-ai-functional-testing';
import {
  discoverEisJudgeInferenceIds,
  enableCcm,
  judgeLlmSmokeFailure,
  recordLlmSmokeJudgement,
} from '@kbn/gen-ai-functional-testing';
import type { FtrProviderContext } from '../ftr_provider_context';

const EIS_CCM_API_KEY_ENV = 'KIBANA_EIS_CCM_API_KEY';

let ccmEnsured = false;

/** Best-effort extraction of HTTP details from supertest/superagent errors. */
const toEvidence = (target: string, scenario: string, error: unknown): LlmSmokeFailureEvidence => {
  const httpError = error as {
    message?: string;
    status?: number;
    response?: { status?: number; text?: string };
  };
  return {
    target,
    scenario,
    statusCode: httpError.response?.status ?? httpError.status,
    responseBody: httpError.response?.text,
    errorMessage: error instanceof Error ? error.message : String(error),
  };
};

/**
 * Returns an `it` variant with LLM-judged failure triage: on failure, an LLM judge
 * (EIS inference endpoints invoked directly against ES, bypassing Kibana) classifies
 * the failure — provider-side failures skip the test instead of failing CI, anything
 * else fails as usual. The judgement is recorded for CI monitoring either way.
 */
export const createJudgedIt = (
  { getService }: FtrProviderContext,
  target: string
): ((title: string, run: () => Promise<void>) => void) => {
  const es = getService('es');
  const log = getService('log');

  const triage = async (evidence: LlmSmokeFailureEvidence): Promise<LlmSmokeFailureJudgement> => {
    let judgement: LlmSmokeFailureJudgement;
    try {
      const apiKey = process.env[EIS_CCM_API_KEY_ENV];
      if (apiKey && !ccmEnsured) {
        await enableCcm(es, apiKey, log);
        ccmEnsured = true;
      }
      judgement = await judgeLlmSmokeFailure({
        esClient: es,
        evidence,
        judgeInferenceIds: await discoverEisJudgeInferenceIds(es),
      });
    } catch (error) {
      judgement = {
        verdict: 'unknown',
        reason: `judge unavailable: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    recordLlmSmokeJudgement(evidence, judgement);
    log.warning(
      `[LLM-SMOKE-JUDGE] target=${evidence.target} scenario=${evidence.scenario} verdict=${
        judgement.verdict
      } judge=${judgement.judgeInferenceId ?? 'none'} reason=${judgement.reason}`
    );
    return judgement;
  };

  return (title, run) => {
    it(title, async function () {
      try {
        await run();
      } catch (error) {
        const judgement = await triage(toEvidence(target, title, error));
        if (judgement.verdict === 'provider') {
          log.warning(
            `[LLM-SMOKE-JUDGE] skipping "${title}" for ${target}: provider failure (judged by ${judgement.judgeInferenceId})`
          );
          this.skip();
        }
        throw error;
      }
    });
  };
};
