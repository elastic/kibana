# Attachments framework — default (feature-flag ON, unified) API tests

These suites cover the cases **attachments framework** HTTP API with the
`xpack.cases.attachments.enabled` feature flag **ON** — the unified attachment
registry writing to the `cases-attachments` saved object. This is the default
attachment framework going forward, so the directory carries no qualifier.

They run under `config_trial_attachments.ts`, pinned
`--xpack.cases.attachments.enabled=true`.

## Why this directory is separate

The attachments-framework tests are split by flag-sensitivity into two
dedicated, flag-pinned configs so the rest of the API suite stays agnostic to
`xpack.cases.attachments.enabled`:

- `attachments_framework/` (this directory) — the **default** unified coverage
  (FF-ON). Runs under `config_trial_attachments.ts`, pinned `=true`.
- `attachments_framework_legacy/` — byte-clean **FF-OFF** coverage. Asserts the
  exact legacy `cases-comments` on-disk shape, so it only holds with the flag
  off. Runs under `config_trial_attachments_legacy.ts`, pinned `=false`, to
  preserve byte-clean coverage until the flag is fully retired post-9.5.

Neither directory is loaded by the shared `tests/common/index.ts`, so
`config_basic.ts` / `config_trial_common.ts` and every other config are
unaffected by the flag.

The flag-agnostic validator-400 assertions for `endpoint` and `osquery` (a 400
is the contract regardless of flag state) live here alongside the FF-ON
coverage; the byte-clean FF-OFF assertions live in `attachments_framework_legacy/`.

## Naming: `attachment_framework` vs `attachments_framework`

- `attachments_framework` (plural) — the **API** integration suites (this
  directory and its FF-OFF legacy sibling).
- `attachment_framework` (singular) — the **UI** functional suites
  (e.g. `test/functional_with_es_ssl/apps/cases/group2/attachment_framework.ts`).

The two are unrelated apart from the domain; mind the plural/singular when
searching.
