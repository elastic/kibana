# APM Cypress → Scout Migration Gap Analysis

## Gap Analysis Table

| Cypress Spec | Existing Scout Coverage | Action | New Scout Spec |
|--------------|-------------------------|--------|----------------|
| `_404.cy.ts` | None | **CREATE** | `404/404.spec.ts` |
| `deep_links.cy.ts` | None | **CREATE** | `deep_links/deep_links.spec.ts` |
| `diagnostics/diagnostics.cy.ts` | None | **CREATE** | `diagnostics/diagnostics.spec.ts` |
| `feature_flag/comparison.cy.ts` | None | **CREATE** | `feature_flag/feature_flag_comparison.spec.ts` |
| `home.cy.ts` | Partial (service inventory) | **CREATE** | `home/home.spec.ts` |
| `infrastructure/infrastructure_page.cy.ts` | None | **CREATE** | `infrastructure/infrastructure.spec.ts` |
| `mobile/mobile_transactions.cy.ts` | `service_overview_mobile` (overview only) | **CREATE** | `mobile/mobile_transactions.spec.ts` |
| `mobile/mobile_transaction_details.cy.ts` | None | **CREATE** | `mobile/mobile_transaction_details.spec.ts` |
| `navigation.cy.ts` | `service_overview_navigation` (different) | **CREATE** | `navigation/navigation.spec.ts` |
| `no_data_screen.cy.ts` | None | **CREATE** | `no_data_screen/no_data_screen.spec.ts` |
| `onboarding/onboarding.cy.ts` | None | **CREATE** | `onboarding/onboarding.spec.ts` |
| `rules/error_count.cy.ts` | `alerts/error_count.spec.ts` | **COVERED** | — |
| `service_inventory/service_inventory.cy.ts` | `service_inventory/service_inventory.spec.ts` | **COVERED** | — |
| `service_map/service_map.cy.ts` | `service_map/service_map.spec.ts` (Cypress file not present in repo) | **COVERED** | — |
| `service_overview/aws_lambda/aws_lambda.cy.ts` | None (Cypress **SKIPPED**) | **CREATE** with `test.skip()` | `service_overview/aws_lambda.spec.ts` |
| `service_overview/azure_functions/azure_functions.cy.ts` | None | **CREATE** | `service_overview/azure_functions.spec.ts` |
| `service_overview/errors_table.cy.ts` | Partial (`service_overview_error_details` for OTEL/EDOT) | **CREATE** | `service_overview/errors_table.spec.ts` |
| `service_overview/mobile_overview_with_most_used_charts.cy.ts` | None (Cypress **SKIPPED**) | **CREATE** with `test.skip()` | `service_overview/mobile_overview_with_most_used_charts.spec.ts` |
| `service_overview/time_comparison.cy.ts` | None (Cypress **SKIPPED**) | **CREATE** with `test.skip()` | `service_overview/time_comparison.spec.ts` |
| `trace_explorer/trace_explorer.cy.ts` | None | **CREATE** | `trace_explorer/trace_explorer.spec.ts` |
| `tutorial/tutorial.cy.ts` | None | **CREATE** | `tutorial/tutorial.spec.ts` |

## New Files Created

| File | Lines |
|------|-------|
| `parallel_tests/404/404.spec.ts` | 24 |
| `parallel_tests/deep_links/deep_links.spec.ts` | 95 |
| `parallel_tests/diagnostics/diagnostics.spec.ts` | 118 |
| `parallel_tests/feature_flag/feature_flag_comparison.spec.ts` | 126 |
| `parallel_tests/home/home.spec.ts` | 54 |
| `parallel_tests/infrastructure/infrastructure.spec.ts` | 52 |
| `parallel_tests/mobile/mobile_transactions.spec.ts` | 51 |
| `parallel_tests/mobile/mobile_transaction_details.spec.ts` | 40 |
| `parallel_tests/navigation/navigation.spec.ts` | 58 |
| `parallel_tests/no_data_screen/no_data_screen.spec.ts` | 92 |
| `parallel_tests/onboarding/onboarding.spec.ts` | 98 |
| `parallel_tests/service_overview/errors_table.spec.ts` | 69 |
| `parallel_tests/service_overview/aws_lambda.spec.ts` | 32 |
| `parallel_tests/service_overview/azure_functions.spec.ts` | 40 |
| `parallel_tests/service_overview/mobile_overview_with_most_used_charts.spec.ts` | 38 |
| `parallel_tests/service_overview/time_comparison.spec.ts` | 48 |
| `parallel_tests/trace_explorer/trace_explorer.spec.ts` | 33 |
| `parallel_tests/tutorial/tutorial.spec.ts` | 48 |
| `fixtures/synthtrace/infrastructure_data.ts` | 55 |
| `fixtures/synthtrace/azure_functions_data.ts` | 44 |
| `fixtures/synthtrace/mobile_app_data.ts` | 165 |

## Scout Test Patterns (Findings)

1. **Package**: APM uses `@kbn/scout-oblt` (observability solutions package).
2. **Tags**: All specs use `tags.stateful.classic` and `tags.serverless.observability.complete`.
3. **Auth**: `browserAuth.loginAsViewer()` for read-only, `loginAsEditor()` for write, `loginAsAdmin()` for diagnostics.
4. **Fixtures**: Tests extend local `../../fixtures` which provides `pageObjects`, `testData`, `kbnUrl`, `browserAuth`.
5. **Synthtrace**: Data is indexed in `global.setup.ts` via `globalSetupHook`. All fixtures use `testData.START_DATE` and `testData.END_DATE`.
6. **Mobile app vs mobile services**: Mobile transactions/details require `apm.mobileApp()` data; service overview uses `apm.service()` with mobile agent names.
7. **Advanced settings**: Use `fetch` + `internal/kibana/settings` with Basic auth for editor; `fetch` + `internal/apm-sources/settings/apm-indices/save` for APM indices.
8. **Skipped Cypress tests**: Implemented with `test.skip()` and linked to GitHub issues in comments.
9. **`scout_react_flow_service_map`**: Not present in the APM worktree; may exist in main Kibana.
