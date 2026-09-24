# Writing tests against `UserAtSpaceScenarios`

`scenarios.ts` exports `UserAtSpaceScenarios`, a matrix of user/space combinations. Iterating it
multiplies a test's cost by the number of scenarios (7, or more when a suite appends extra users),
so it should only wrap assertions whose outcome depends on the user's privileges.

The gap suites once ran entire files inside the matrix, which pushed `security_and_spaces/group8`
past the 50-minute Buildkite step limit. Keep new tests in these three tiers:

- **Authorization** — one test per endpoint stays inside the loop, with an exhaustive
  `switch (scenario.id)` whose `default` throws so a new scenario fails loudly. Denied scenarios
  should assert their `403`/`401` _before_ creating fixtures: issue the request, assert, `return`.
  Some endpoints name the rule type in their unauthorized message, so the rule has to exist even
  on the denied path — see `group10/tests/alerting/gap/find.ts`.
- **Behavior** — expensive flows (`retry.try`, scheduler polling, backfill fill/cleanup,
  `event_log/refresh`) belong in a ``describe(`${SuperuserAtSpace1.id} (runs once)`)`` block that
  runs a single time. `group9/tests/alerting/gap/update_gaps.ts` is the reference shape.
- **Validation** — scenario-independent `400`/`401`/`404`/`409` checks run once in the same block.

Avoid `if (!isUserAuthorized(scenario.id)) return;` guards. They still register a test for every
scenario and report the empty runs as passing, which is misleading in CI output. Move the test out
of the loop instead.
