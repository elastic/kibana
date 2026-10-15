# Attachments framework — legacy (feature-flag OFF, byte-clean) API tests

These suites cover the cases **attachments framework** HTTP API while the
`xpack.cases.attachments.enabled` feature flag is **OFF** — i.e. the legacy
external-reference / persistable-state frameworks writing to the
`cases-comments` saved object. They assert the exact on-disk `cases-comments`
shape (byte-clean storage), so they only hold with the flag off.

## Why this directory is separate

The attachments-framework tests are split by flag-sensitivity into two
dedicated, flag-pinned configs so the rest of the API suite stays agnostic to
`xpack.cases.attachments.enabled`:

- `attachments_framework_legacy/` (this directory) — byte-clean **FF-OFF**
  coverage. Runs under `config_trial_attachments_legacy.ts`, pinned
  `--xpack.cases.attachments.enabled=false`, so it keeps running once the flag
  defaults to ON (until the flag is fully retired post-9.5).
- `attachments_framework/` — the **default** unified coverage (FF-ON). Runs
  under `config_trial_attachments.ts`, pinned `=true`.

Neither directory is loaded by the shared `tests/common/index.ts`, so
`config_basic.ts` / `config_trial_common.ts` and every other config are
unaffected by the flag.

Flag-agnostic validator-400 assertions for `endpoint` / `osquery` live in the
matching files under `attachments_framework/` (the FF-ON suite), not here.

## Naming: `attachment_framework` vs `attachments_framework`

- `attachments_framework` (plural) — the **API** integration suites (this
  directory and its FF-ON sibling).
- `attachment_framework` (singular) — the **UI** functional suites
  (e.g. `test/functional_with_es_ssl/apps/cases/group2/attachment_framework.ts`).

The two are unrelated apart from the domain; mind the plural/singular when
searching.
