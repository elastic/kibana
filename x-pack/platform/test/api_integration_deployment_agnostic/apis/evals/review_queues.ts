/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  EVALS_REVIEW_QUEUES_URL,
  EVALS_SCORES_URL,
  EvaluationIndices,
  type BlindReviewItem,
  type GetNextReviewItemResponse,
  type ReviewQueueAgreement,
  type ReviewQueueWithCounts,
  type SubmitReviewItemResponse,
} from '@kbn/evals-common';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { SupertestWithRoleScopeType } from '../../services';
import { getEvalsApiClientForRole } from './helpers/api_client';
import {
  buildScore,
  buildScoresRequestBody,
  uniqueSuffix,
  uniqueTraceId,
} from './helpers/fixtures';

const EVALUATOR_VERSION = '1.0.0';
const SEEDED_EXAMPLES = 6;

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const es = getService('es');

  let adminClient: SupertestWithRoleScopeType;
  let viewerClient: SupertestWithRoleScopeType;

  describe('Evals - Human review queues', function () {
    const suiteId = `ftr-review-${uniqueSuffix()}`;
    const experimentId = `experiment-${suiteId}`;
    const datasetId = `dataset-${suiteId}`;
    const datasetName = `Dataset ${suiteId}`;

    const queueBody = {
      name: `Queue ${suiteId}`,
      source_filter: { source: 'experiment', experiment_id: experimentId },
      evaluator_name: 'correctness',
      evaluator_version: EVALUATOR_VERSION,
      sample_size: 4,
      strategy: 'uniform',
      rubric: 'Pass when the answer matches the question.',
    };

    let queueId: string;

    before(async () => {
      adminClient = await getEvalsApiClientForRole(roleScopedSupertest, 'admin');
      viewerClient = await getEvalsApiClientForRole(roleScopedSupertest, 'viewer');

      const scores = Array.from({ length: SEEDED_EXAMPLES }).map((_unused, index) =>
        buildScore({
          exampleId: `example-${index}`,
          exampleIndex: index,
          datasetId,
          datasetName,
          evaluatorVersion: EVALUATOR_VERSION,
          score: index % 2,
          label: index % 2 ? 'pass' : 'fail',
          traceId: uniqueTraceId(),
        })
      );

      await adminClient
        .post(EVALS_SCORES_URL)
        .send(buildScoresRequestBody({ experimentId, suiteId, scores }))
        .expect(200);
    });

    after(async () => {
      await adminClient.destroy();
      await viewerClient.destroy();
      await es
        .deleteByQuery({
          index: EvaluationIndices.SCORES,
          query: { term: { 'metadata.suite_id': suiteId } },
          refresh: true,
          conflicts: 'proceed',
          ignore_unavailable: true,
        })
        .catch(() => {
          // best-effort cleanup
        });
    });

    it('rejects queue creation without manage_evals_review privileges (viewer)', async () => {
      await viewerClient.post(EVALS_REVIEW_QUEUES_URL).send(queueBody).expect(403);
    });

    it('creates a queue sampled from the seeded scores with every item pending', async () => {
      const { body } = await adminClient.post(EVALS_REVIEW_QUEUES_URL).send(queueBody).expect(200);

      const queue = body as ReviewQueueWithCounts;
      queueId = queue.id;
      expect(queue.counts).to.eql({ pending: 4, reviewed: 0, skipped: 0 });
      expect(queue.evaluator_name).to.eql('correctness');
    });

    it('rejects reading a queue and its next item without manage_evals_review privileges', async () => {
      await viewerClient.get(`${EVALS_REVIEW_QUEUES_URL}/${queueId}`).expect(403);
      await viewerClient.get(`${EVALS_REVIEW_QUEUES_URL}/${queueId}/_next`).expect(403);
      await viewerClient.get(`${EVALS_REVIEW_QUEUES_URL}/${queueId}/agreement`).expect(403);
    });

    it('serves the next pending item without the judge verdict', async () => {
      const { body } = await adminClient
        .get(`${EVALS_REVIEW_QUEUES_URL}/${queueId}/_next`)
        .expect(200);

      const { item } = body as GetNextReviewItemResponse;
      expect(item).to.not.be(null);
      expect(item).to.not.have.property('score');
      expect((item as BlindReviewItem).status).to.eql('pending');
    });

    it('reveals the judge verdict on submit and reports agreement with n and an interval', async () => {
      for (let reviewed = 0; reviewed < 4; reviewed++) {
        const { body: next } = await adminClient
          .get(`${EVALS_REVIEW_QUEUES_URL}/${queueId}/_next`)
          .expect(200);
        const { item } = next as GetNextReviewItemResponse;
        expect(item).to.not.be(null);

        const { body: submitted } = await adminClient
          .post(`${EVALS_REVIEW_QUEUES_URL}/${queueId}/items/${(item as BlindReviewItem).id}`)
          .send({ label: reviewed % 2 ? 'pass' : 'fail', rationale: 'checked by FTR' })
          .expect(200);

        const { item: revealed } = submitted as SubmitReviewItemResponse;
        expect(revealed.status).to.eql('reviewed');
        expect(revealed.score).to.have.property('label');
      }

      const { body: after } = await adminClient
        .get(`${EVALS_REVIEW_QUEUES_URL}/${queueId}/_next`)
        .expect(200);
      expect((after as GetNextReviewItemResponse).item).to.be(null);

      const { body } = await adminClient
        .get(`${EVALS_REVIEW_QUEUES_URL}/${queueId}/agreement`)
        .expect(200);

      const agreement = body as ReviewQueueAgreement;
      expect(agreement.counts.reviewed).to.eql(4);
      expect(agreement.binary?.n).to.eql(4);
      expect(agreement.binary?.rawAgreementInterval).to.not.be(null);
    });

    it('refuses a second verdict for an item that was already reviewed', async () => {
      const { body: queue } = await adminClient
        .get(`${EVALS_REVIEW_QUEUES_URL}/${queueId}`)
        .expect(200);
      expect((queue as ReviewQueueWithCounts).counts.reviewed).to.eql(4);

      await adminClient
        .post(`${EVALS_REVIEW_QUEUES_URL}/${queueId}/items/${queueId}:0`)
        .send({ label: 'pass' })
        .expect(409);
    });
  });
}
