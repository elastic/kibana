/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Detection, Severity, SignificantEvent } from '@kbn/significant-events-schema';
import type {
  ChronicSeedConfig,
  ChronicSeedSegment,
} from '../../data_generators/seed_chronic_background';
import type { ExpectedBaseline } from '../../evaluators/discovery/types';
import type { DatasetConfig, DiscoveryScenario } from '../types';

/**
 * Incident onset in snapshot-time coordinates — the change point the detection rules fired on.
 * The eval harness maps it onto the replayed timeline (see `canonicalDetectionsFromGroundTruth`)
 * so the grounding skill's pre/post rate windows frame the actual incident neighborhood.
 */
const SNAPSHOT_CHANGE_POINT = '2026-06-25T14:30:00Z';

const toInputDetections = (events: Array<Partial<SignificantEvent>>): Array<Partial<Detection>> =>
  events
    .flatMap((event) => event.signals ?? [])
    .map((signal) => ({
      '@timestamp': SNAPSHOT_CHANGE_POINT,
      detection_id: signal.metadata?.detection_id,
      rule_name: signal.metadata?.rule_name,
      rule_uuid: signal.metadata?.rule_uuid,
      source_id: signal.source_id,
      change_point_type: signal.metadata?.change_point_type ?? 'spike',
      p_value: signal.metadata?.p_value ?? 0.0001,
    }));

/**
 * Canonical cascade significant event — the lean ground truth for the discovery agent eval.
 * Evidences carry the `esql_query` for grounding but are deliberately NOT pre-stamped with a verdict —
 * the agent must run execute_esql during KI grounding and stamp `verdict: "confirms"` from its own
 * query results before promoting. Every field here is seeded by one of the cascade `detections`, so
 * the canonical input and this expected answer stay self-consistent.
 */
const LEDGER_DB_CASCADE_EVENT_ID = 'transactionhistory__frontend-transactionhistory-read-timeout';

const LEDGER_DB_CASCADE_EVENT: Partial<SignificantEvent> = {
  status: 'active',
  event_id: LEDGER_DB_CASCADE_EVENT_ID,
  title:
    'Ledger services — database connection errors and read timeouts across balance, history, and payment paths',
  symptom_hypothesis:
    'SQLState 08001 (unable to establish a database connection) from transactionhistory is blocking ledger reads and cascading to frontend balance, history, payment, and deposit paths.',
  summary:
    'Frontend requests to transactionhistory, balancereader, and ledgerwriter time out (read timeout=4) on the observed paths. Cache errors affect balance and transaction-history lookups, while transactionhistory also reports SQLState 08001. Users cannot view account balances or transaction history and cannot submit payments or deposits. Onset ~14:30 UTC with no sign of recovery.',
  severity: 'critical',
  confidence: 0.82,
  source_ids: ['logs'],
  signals: [
    {
      type: 'detection',
      source_id: 'logs',
      verdict: 'confirms',
      description:
        'Found: SQLState 08001 database connection error from transactionhistory. Impact: transaction-history reads blocked.',
      evidence: {
        esql_query:
          'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "SQLState: 08001") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
        result: 'found',
      },
      metadata: {
        detection_id: 'db7de543-0f37-5db4-a0ff-c75c92f0eca1-det',
        rule_name: 'Transaction History Database SQL Connection Error',
        rule_uuid: 'db7de543-0f37-5db4-a0ff-c75c92f0eca1',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
    {
      type: 'detection',
      source_id: 'logs',
      verdict: 'confirms',
      description:
        'Found: read timeouts (read timeout=4) calling transactionhistory:8080 on /transactions. Impact: users cannot view transaction history.',
      evidence: {
        esql_query:
          'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Error getting transaction_list") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
        result: 'found',
      },
      metadata: {
        detection_id: '2cd4c371-f1c3-5c19-a115-1c03be31317e-det',
        rule_name: 'Frontend → Transaction History Connection Failures',
        rule_uuid: '2cd4c371-f1c3-5c19-a115-1c03be31317e',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
    {
      type: 'detection',
      source_id: 'logs',
      verdict: 'confirms',
      description:
        'Found: read timeouts (read timeout=4) calling balancereader:8080 on /balances. Impact: users cannot view account balances.',
      evidence: {
        esql_query:
          'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Error getting balance") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
        result: 'found',
      },
      metadata: {
        detection_id: '3c4bf4f9-9ed9-567f-be35-332eb79ee76a-det',
        rule_name: 'Frontend → Balance Reader Connection Failures',
        rule_uuid: '3c4bf4f9-9ed9-567f-be35-332eb79ee76a',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
    {
      type: 'detection',
      source_id: 'logs',
      verdict: 'confirms',
      description:
        'Found: Cache error from transactionhistory and balancereader. Impact: balance and transaction-history lookups degraded.',
      evidence: {
        esql_query:
          'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Cache error") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 2',
        result: 'found',
      },
      metadata: {
        detection_id: '159d6c01-9b26-5d7f-99c6-a3471e00d97e-det',
        rule_name: 'Cache Errors in Balance Reader or Transaction History',
        rule_uuid: '159d6c01-9b26-5d7f-99c6-a3471e00d97e',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
    {
      type: 'detection',
      source_id: 'logs',
      verdict: 'confirms',
      description:
        'Found: Failed to retrieve account balance. Impact: payment and deposit submissions fail.',
      evidence: {
        esql_query:
          'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Failed to retrieve account balance") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
        result: 'found',
      },
      metadata: {
        detection_id: '0ae69b00-d0f3-5c57-971d-2470ad5b6459-det',
        rule_name: 'Ledger Writer Failed to Retrieve Account Balance',
        rule_uuid: '0ae69b00-d0f3-5c57-971d-2470ad5b6459',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
    {
      type: 'detection',
      source_id: 'logs',
      verdict: 'confirms',
      description:
        'Found: read timeouts (read timeout=4) calling ledgerwriter:8080 on deposit /transactions. Impact: users cannot complete deposits.',
      evidence: {
        esql_query:
          'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Error submitting deposit") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
        result: 'found',
      },
      metadata: {
        detection_id: '64f04c77-495a-58cb-beba-98108fcaa5dd-det',
        rule_name: 'Frontend → Ledger Writer Deposit Submission Error',
        rule_uuid: '64f04c77-495a-58cb-beba-98108fcaa5dd',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
    {
      type: 'detection',
      source_id: 'logs',
      verdict: 'confirms',
      description:
        'Found: read timeouts (read timeout=4) calling ledgerwriter:8080 on payment /transactions. Impact: users cannot complete payments.',
      evidence: {
        esql_query:
          'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Error submitting payment") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
        result: 'found',
      },
      metadata: {
        detection_id: '431f1573-2ad6-5847-9602-283c63450d6b-det',
        rule_name: 'Frontend → Ledger Writer Payment Submission Error',
        rule_uuid: '431f1573-2ad6-5847-9602-283c63450d6b',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
  ],
  causal_features: [
    {
      feature_id: 'transactionhistory',
      type: 'entity',
      subtype: 'service',
      name: 'transactionhistory',
      source_id: 'logs',
    },
    {
      feature_id: 'balancereader',
      type: 'entity',
      subtype: 'service',
      name: 'balancereader',
      source_id: 'logs',
    },
    {
      feature_id: 'ledgerwriter',
      type: 'entity',
      subtype: 'service',
      name: 'ledgerwriter',
      source_id: 'logs',
    },
  ],
  blast_radius: [
    {
      type: 'dependency',
      subtype: 'http',
      feature_id: 'frontend-balancereader-http',
      source: 'frontend',
      target: 'balancereader',
      protocol: 'http',
      source_id: 'logs',
    },
    {
      type: 'dependency',
      subtype: 'http',
      feature_id: 'frontend-transactionhistory-http',
      source: 'frontend',
      target: 'transactionhistory',
      protocol: 'http',
      source_id: 'logs',
    },
    {
      type: 'dependency',
      subtype: 'http',
      feature_id: 'frontend-ledgerwriter-http',
      source: 'frontend',
      target: 'ledgerwriter',
      protocol: 'http',
      source_id: 'logs',
    },
    {
      type: 'dependency',
      subtype: 'http',
      feature_id: 'ledgerwriter-balancereader-http',
      source: 'ledgerwriter',
      target: 'balancereader',
      protocol: 'http',
      source_id: 'logs',
    },
  ],
};

const LEDGER_DB_CASCADE_RULE_UUIDS = (LEDGER_DB_CASCADE_EVENT.signals ?? [])
  .map((signal) => signal.metadata?.rule_uuid)
  .filter((ruleUuid): ruleUuid is string => Boolean(ruleUuid));

/** Benign login spike — must stay a SEPARATE event from the failure cascade and from signup. */
const BENIGN_LOGIN_EVENT: Partial<SignificantEvent> = {
  status: 'inactive',
  event_id: 'userservice__successful-user-login',
  title: 'Authentication — successful login volume increase',
  symptom_hypothesis: 'Successful login activity increased without an observed failure.',
  summary:
    'Successful login events increased around 14:30 UTC. All sampled events completed successfully, with no observed error signature or blocked user task.',
  severity: 'low',
  confidence: 0.35,
  signals: [
    {
      type: 'detection',
      source_id: 'logs',
      verdict: 'refutes',
      description: 'Found: successful login activity. Impact: none observed.',
      evidence: {
        esql_query:
          'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Login Successful") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
        result: 'found',
      },
      metadata: {
        detection_id: '0dfb4f2f-2060-5369-9d75-02287ea4e060-det',
        rule_name: 'Successful User Login',
        rule_uuid: '0dfb4f2f-2060-5369-9d75-02287ea4e060',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
  ],
};

/** Benign signup spike — must stay a SEPARATE event from the failure cascade and from login. */
const BENIGN_SIGNUP_EVENT: Partial<SignificantEvent> = {
  status: 'inactive',
  event_id: 'userservice__new-account-created',
  title: 'Authentication — new account creation volume increase',
  symptom_hypothesis: 'New account creation activity increased without an observed failure.',
  summary:
    'New account-creation events increased around 14:30 UTC. All sampled events completed successfully, with no observed error signature or blocked user task.',
  severity: 'low',
  confidence: 0.35,
  signals: [
    {
      type: 'detection',
      source_id: 'logs',
      verdict: 'refutes',
      description: 'Found: successful account creation activity. Impact: none observed.',
      evidence: {
        esql_query:
          'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Successfully created user") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
        result: 'found',
      },
      metadata: {
        detection_id: '334488fe-8405-5e30-b538-ba028b6b0961-det',
        rule_name: 'New User Account Created',
        rule_uuid: '334488fe-8405-5e30-b538-ba028b6b0961',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
  ],
};

const BALANCE_READER_ISOLATED_EVENT: Partial<SignificantEvent> = {
  status: 'active',
  event_id: 'frontend__balancereader-connection-refused',
  title: 'Balance reader — account balance lookup connectivity failure',
  symptom_hypothesis:
    'Account balance reads fail because balancereader does not answer the frontend within the 4 s read timeout on its balance endpoint.',
  summary:
    'The frontend reports read timeouts (read timeout=4) calling balancereader:8080 on /balances. Users who reach this path cannot view account balances. Evidence is confined to this lookup path rather than a multi-service cascade.',
  severity: 'high',
  confidence: 0.68,
  source_ids: ['logs'],
  signals: [
    {
      type: 'detection',
      source_id: 'logs',
      verdict: 'confirms',
      description:
        'Found: read timeouts (read timeout=4) calling balancereader:8080 on /balances. Impact: users cannot view account balances. Verdict: confirms.',
      evidence: {
        esql_query:
          'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Error getting balance") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
        result: 'found',
      },
      metadata: {
        detection_id: '3c4bf4f9-9ed9-567f-be35-332eb79ee76a-det',
        rule_name: 'Frontend → Balance Reader Connection Failures',
        rule_uuid: '3c4bf4f9-9ed9-567f-be35-332eb79ee76a',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
  ],
  causal_features: [
    {
      feature_id: 'balancereader',
      type: 'entity',
      subtype: 'service',
      name: 'balancereader',
      source_id: 'logs',
    },
  ],
  blast_radius: [
    {
      type: 'dependency',
      subtype: 'http',
      feature_id: 'frontend-balancereader-http',
      source: 'frontend',
      target: 'balancereader',
      source_id: 'logs',
    },
  ],
};

/** Same confirmed impact as isolated balancereader failure, but weak detection metadata — severity must still follow grounding. */
const BALANCE_READER_WEAK_DETECTION_EVENT: Partial<SignificantEvent> = {
  ...BALANCE_READER_ISOLATED_EVENT,
  event_id: 'frontend__balancereader-connection-refused-weak-detection',
  confidence: 0.52,
  signals: [
    {
      type: 'detection',
      source_id: 'logs',
      verdict: 'confirms',
      description:
        'Found: read timeouts (read timeout=4) calling balancereader:8080 on /balances. Impact: users cannot view account balances. Verdict: confirms.',
      evidence: BALANCE_READER_ISOLATED_EVENT.signals?.[0]?.evidence,
      metadata: {
        detection_id: '3c4bf4f9-9ed9-567f-be35-332eb79ee76a-det-weak',
        rule_name: 'Frontend → Balance Reader Connection Failures',
        rule_uuid: '3c4bf4f9-9ed9-567f-be35-332eb79ee76a',
        change_point_type: 'stationary',
        p_value: 0.55,
      },
    },
  ],
};

const MINUTES_PER_DAY = 24 * 60;
const daysToMinutes = (days: number): number => days * MINUTES_PER_DAY;

/**
 * A seeded failure pattern with a known rate over time, graded on the baseline facts the agent
 * states for it. Severity and status are not graded: only the baseline profile is under test.
 */
const baselineScenario = ({
  slug,
  ruleUuid,
  title,
  phrase,
  level,
  attributes,
  segments,
  expectedBaseline,
  expectedSeverity,
  criterion,
}: {
  slug: string;
  ruleUuid: string;
  title: string;
  /**
   * The failure text the seeded rows carry, written as a failing operation. Unique, and never a
   * part of another scenario's phrase: the scenarios share one stream.
   */
  phrase: string;
  level?: ChronicSeedConfig['level'];
  attributes?: ChronicSeedConfig['attributes'];
  segments: ChronicSeedSegment[];
  /** What the baseline profile must show; leave out for a scenario that needs no profile. */
  expectedBaseline?: ExpectedBaseline;
  /** Grades the tier with `severity_exact`; leave out to grade only the baseline profile. */
  expectedSeverity?: Severity;
  criterion: string;
}): DiscoveryScenario => {
  return {
    input: {
      scenario_id: `baseline-${slug}`,
      source_id: 'logs',
      detections: [
        {
          detection_id: `${ruleUuid}-det`,
          rule_name: title,
          rule_uuid: ruleUuid,
          source_id: 'logs',
          change_point_type: 'spike',
          p_value: 0.0001,
        },
      ],
      chronic_seed: {
        phrase,
        service: `baseline-probe-${slug}`,
        level,
        attributes,
        segments,
        detection_offset_minutes: 30,
        ki_title: title,
        ki_description: `${title}: the seeded failure phrase for the baseline profile scenario.`,
      },
    },
    output: {
      expected_ground_truth: `A seeded ${slug} failure pattern; its baseline facts must match what was seeded.`,
      expected_significant_events: expectedSeverity
        ? [
            {
              event_id: `baseline-${slug}-event`,
              title,
              status: 'active',
              severity: expectedSeverity,
              signals: [
                {
                  type: 'detection',
                  source_id: 'logs',
                  verdict: 'confirms',
                  description: `${title}: the seeded failure pattern.`,
                  metadata: {
                    detection_id: `${ruleUuid}-det`,
                    rule_name: title,
                    rule_uuid: ruleUuid,
                    change_point_type: 'spike',
                    p_value: 0.0001,
                  },
                },
              ],
            },
          ]
        : [],
      ...(expectedBaseline ? { expected_baseline: { ...expectedBaseline, phrase } } : {}),
      criteria: [{ id: `baseline-${slug}`, text: criterion, score: 2 }],
    },
    metadata: { difficulty: 'medium', failure_domain: 'baseline-profile', failure_mode: slug },
    snapshot_source: { snapshot_name: 'ledger-db-disconnect' },
  };
};

/**
 * Two shapes of the same failing operation, told apart only by their rate over the window (a steady
 * failure the whole window, and a surge on an old low rate), and rows that match a failure phrase but
 * report a normal state. Seeded ranges are wide: the profile's day
 * buckets shift with the time of day the run starts.
 */
const BASELINE_SCENARIOS: DiscoveryScenario[] = [
  baselineScenario({
    slug: 'steady',
    ruleUuid: 'b45e11ae-0001-4000-8000-000000000001',
    title: 'Checkout session failures',
    phrase: 'checkout session creation failed: inventory lookup timed out, order not created',
    segments: [{ from_minutes_ago: daysToMinutes(8), to_minutes_ago: 0, rate_per_minute: 1 }],
    expectedBaseline: { failed_days: [7, 8], days: [7, 8], factor: [0.5, 2] },
    criterion:
      'Describes the failure as long-standing: present on every day of the window at about the same rate, not as a new failure.',
  }),
  baselineScenario({
    slug: 'surge',
    ruleUuid: 'b45e11ae-0002-4000-8000-000000000002',
    title: 'Payment authorization failures surging',
    phrase: 'payment authorization request failed: upstream timeout, request not completed',
    segments: [
      { from_minutes_ago: daysToMinutes(8), to_minutes_ago: daysToMinutes(2), rate_per_minute: 1 },
      { from_minutes_ago: daysToMinutes(2), to_minutes_ago: 0, rate_per_minute: 20 },
    ],
    expectedBaseline: { failed_days: [7, 8], days: [7, 8], factor: [5, 40] },
    expectedSeverity: 'high',
    criterion:
      'Describes the failure as a surge on top of an existing low rate: the last complete day is many times the earlier days.',
  }),
  baselineScenario({
    slug: 'handled',
    ruleUuid: 'b45e11ae-0003-4000-8000-000000000003',
    title: 'Task nudge index lookups failing',
    phrase: 'task nudge poll raised index_not_found_exception: no such index [.demo_task_nudge]',
    level: null,
    attributes: { 'event.name': 'exception', 'error.exception.handled': true },
    segments: [{ from_minutes_ago: daysToMinutes(8), to_minutes_ago: 0, rate_per_minute: 1 }],
    // The rows name an exception, and carry the cue that the caller handled it: the agent must read both.
    criterion:
      'Any event it writes is rated below high, and says that every matched row is an exception its caller handled instead of reporting the request as blocked.',
  }),
];

export const discovery: DatasetConfig['discovery'] = [
  {
    input: {
      scenario_id: 'ledger-db-disconnect',
      source_id: 'logs',
      detections: toInputDetections([
        LEDGER_DB_CASCADE_EVENT,
        BENIGN_LOGIN_EVENT,
        BENIGN_SIGNUP_EVENT,
      ]),
    },
    // Ground-truth continuation chains (ordered, by readable `rule_name`) the continuation eval
    // replays one rule per cycle. Each chain legitimately continues ONE event, so the agent
    // should reuse a single event_id. `cascade` = upstream → downstreams across services, linked
    // by dependency topology.
    // The same-rule and closed-event paths do not depend on the scenario; the weak-detection
    // scenario already replays them.
    continuationPaths: ['cascade'],
    continuationChains: {
      cascade: [
        'Transaction History Database SQL Connection Error',
        'Frontend → Transaction History Connection Failures',
      ],
    },
    output: {
      expected_ground_truth:
        'discoveries=[ledger-db-cascade (transactionhistory/balancereader/ledgerwriter linked by SQLState 08001, cache errors, and frontend read-timeout failures)]; unbacked authentication detections do not shape the cascade narrative',
      expected_confirmed_rule_uuids: {
        [LEDGER_DB_CASCADE_EVENT_ID]: LEDGER_DB_CASCADE_RULE_UUIDS,
      },
      expected_significant_events: [LEDGER_DB_CASCADE_EVENT],
      criteria: [
        {
          id: 'symptom-hypothesis-sql-connection',
          text: 'States a symptom_hypothesis that connects every grouped detection through the evidenced database/connectivity cascade — SQLState 08001 or JDBC connection failures, cache errors, and frontend read timeouts across transactionhistory, balancereader, and ledgerwriter. Uses confirming query rows and compatible KI context for sparse rows, without presenting KI context as proof of current activity or inventing dependency edges absent from grounding.',
          score: 3,
        },
        {
          id: 'cascade-transactionhistory-cluster',
          text: 'Groups the SQL connection failure, the shared cache errors, and the frontend→transactionhistory connection failures into a single discovery (transactionhistory service cluster).',
          score: 1,
        },
        {
          id: 'cascade-full-grouping',
          text: 'Further collapses the frontend→balancereader connection failures and the ledgerwriter balance-retrieval, payment, and deposit failures into the same cascading discovery as the transactionhistory cluster — all seven detections linked by the evidence-backed database-connectivity and cache failure hypothesis rather than split into separate service-scoped discoveries.',
          score: 2,
        },
        {
          id: 'dependency-chain',
          text: 'Names KI-grounded dependency paths in the cascade — at minimum frontend→transactionhistory, frontend→balancereader, and frontend→ledgerwriter HTTP impacts, plus ledgerwriter→balancereader where topology supports it — and describes downstream user-journey impact across balance, transaction-history, payment, and deposit flows.',
          score: 1,
        },
        {
          id: 'error-signatures',
          text: 'Cites observed error signatures (SQLState 08001, cache error, read timed out) rather than generic phrasing.',
          score: 1,
        },
        {
          id: 'objective-narrative',
          text: 'Uses a stable failure-domain title and an objective summary of observed state and potential impact, without recommendations, next actions, or urgency language.',
          score: 1,
        },
        {
          id: 'active-cascade',
          text: 'Sets status=active with severity=critical for the cascade event because active database-connectivity failures broadly break core customer balance, transaction-history, payment, and deposit journeys. Bases critical severity on demonstrated customer impact and scope, without requiring PII exposure or a fixed downstream-service count.',
          score: 3,
        },
        {
          id: 'grounding-verification',
          text: 'Verifies key cascade signals via execute_esql during KI grounding and stamps `verdict: "confirms"` from its own query results, rather than trusting pre-collected input evidence alone.',
          score: 2,
        },
        {
          id: 'reject-unrelated-auth-membership',
          text: 'Omits Successful User Login and New User Account Created from the cascade event because neither has a backed query KI; does not incorporate authentication activity into assessment_note.',
          score: 3,
        },
        {
          id: 'aligned-ledger-narrative',
          text: 'Keeps title, symptom_hypothesis, and summary scoped to the confirmed ledger database connectivity cascade without incorporating authentication activity.',
          score: 3,
        },
        {
          id: 'active-confirmed-cascade',
          text: 'Keeps the cascade event active at critical severity because freshly verified ledger signals still demonstrate the user-blocking database cascade.',
          score: 2,
        },
      ],
    },
    metadata: { difficulty: 'hard', failure_domain: 'ledger-db', failure_mode: 'cascade' },
  },
  {
    input: {
      scenario_id: 'ledger-balancereader-weak-detection',
      source_id: 'logs',
      detections: toInputDetections([BALANCE_READER_WEAK_DETECTION_EVENT]),
    },
    output: {
      expected_ground_truth:
        'active high event for confirmed balance-lookup read timeouts despite weak p_value and stationary change_point_type',
      expected_confirmed_rule_uuids: {
        [BALANCE_READER_WEAK_DETECTION_EVENT.event_id!]: ['3c4bf4f9-9ed9-567f-be35-332eb79ee76a'],
      },
      expected_significant_events: [BALANCE_READER_WEAK_DETECTION_EVENT],
      criteria: [
        {
          id: 'weak-detection-strong-severity',
          text: 'Sets severity=high because grounding confirms read-timeout errors fail account-balance lookups. Weak p_value and stationary change_point_type must not cap severity at medium or low.',
          score: 3,
        },
        {
          id: 'weak-detection-confidence-only',
          text: 'May lower confidence because p_value is weak and change_point_type is stationary, but severity still reflects the confirmed failure impact.',
          score: 2,
        },
        {
          id: 'weak-detection-narrative-alignment',
          text: 'Title, symptom_hypothesis, and summary state the confirmed connection failure and blocked balance lookups without hedging the event down to medium solely because detection metadata looks weak.',
          score: 2,
        },
      ],
    },
    metadata: {
      difficulty: 'hard',
      failure_domain: 'balancereader',
      failure_mode: 'weak_detection_strong_evidence',
    },
    snapshot_source: { snapshot_name: 'ledger-db-disconnect' },
  },
  ...BASELINE_SCENARIOS,
];
