# Writing tests against `UserAtSpaceScenarios`

`scenarios.ts` exports `UserAtSpaceScenarios`, a matrix of user/space combinations used to verify
that an endpoint authorizes correctly. Iterating that matrix multiplies a test's cost by the number
of scenarios (7, or more when a suite appends extra users), so it should only wrap assertions whose
outcome actually depends on the user's privileges.

Gap suites previously ran their whole file inside the matrix, which made
`security_and_spaces/group8` exceed the 50-minute Buildkite step limit and auto-retry three times.
Keep new tests in the tiers below to avoid reintroducing that.

## Tier 1 — authorization matrix (inside the loop)

Exactly one test per endpoint stays inside `for (const scenario of UserAtSpaceScenarios)`, with an
exhaustive `switch (scenario.id)` whose `default` throws. The `default` throw is what forces a new
scenario to be triaged rather than silently skipped.

Denied scenarios must reach their `403`/`401` without paying for fixtures they do not need. Issue
the request first, assert, and `return` before creating rules or reporting gaps:

```ts
it('should return rules with gaps in given time range', async () => {
  switch (scenario.id) {
    case 'no_kibana_privileges at space1':
    case 'space_1_all at space2': {
      const deniedResponse = await callEndpoint();
      expect(deniedResponse.statusCode).to.eql(403);
      return;
    }

    case 'superuser at space1':
    // ...remaining authorized scenarios
      break;

    default:
      throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
  }

  // Fixtures and authorized assertions only run for scenarios that get past the switch.
});
```

Some endpoints name the rule type in their unauthorized message (`find.ts` is one), which means the
rule has to exist even for a denial. Hoist only what the assertion genuinely allows.

## Tier 2 — behavior (runs once)

Anything expensive — `retry.try` polling, scheduler runs, backfill scheduling, gap fill/cleanup,
`_test/event_log/refresh` — belongs in a `describe` that destructures `SuperuserAtSpace1` and runs a
single time. Name it so CI output makes the intent obvious:

```ts
// Scheduler behavior does not vary by role, so it runs once.
describe(`${SuperuserAtSpace1.id} (runs once)`, () => {
  const { user, space } = SuperuserAtSpace1;
  // ...
});
```

`group9/tests/alerting/gap/update_gaps.ts` is a good reference: it is superuser-only throughout.

## Tier 3 — validation (runs once)

Request-validation checks (`400` on a malformed body, `401` unauthenticated, `409` on a duplicate,
`404` for a missing id) do not depend on role, so they go in the same `SuperuserAtSpace1` block.

## Do not use early-return guards

```ts
// Avoid: registers a test for every scenario and reports the skipped ones as passing.
it('scheduler fills the gap', async () => {
  if (!isUserAuthorized(scenario.id)) {
    return;
  }
  // ...
});
```

A guard like this still pays mocha's per-test overhead for every scenario and, worse, reports empty
runs as green. Move the test out of the loop instead.
