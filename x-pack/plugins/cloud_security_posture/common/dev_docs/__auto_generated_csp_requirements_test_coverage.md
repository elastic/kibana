# Cloud Security Posture - Requirements Test Coverage

<!-- This file is auto-generated. Any changes will be overwritten. -->This document provides a summary of the requirements test coverage for Cloud Security Posture.

You can also check out the dedicated app view, which enables easier search and filter functionalities.
[Requirement test coverage app](https://vxgs2c.csb.app/)

## Directory: x-pack/packages/kbn-cloud-security-posture

**Total Tests:** 10 | **Skipped:** 0 (0.00%) | **Todo:** 0 (0.00%)

![](https://img.shields.io/badge/KBN-PACKAGE-blueviolet)

<details>
<summary>Test Details</summary>

| Test Label | Type | Skipped | Todo |
|------------|------|---------|------|
| [test helper methods](x-pack/packages/kbn-cloud-security-posture-common/utils/helpers.test.ts) | describe |  |  |
| [extractErrorMessage Test](x-pack/packages/kbn-cloud-security-posture-common/utils/helpers.test.ts) | describe |  |  |
| [should return error message if input is instance of Error](x-pack/packages/kbn-cloud-security-posture-common/utils/helpers.test.ts) | it |  |  |
| [should return string if input is string](x-pack/packages/kbn-cloud-security-posture-common/utils/helpers.test.ts) | it |  |  |
| [should return fallbackMessage is input is not string nor instance of Error](x-pack/packages/kbn-cloud-security-posture-common/utils/helpers.test.ts) | it |  |  |
| [should return default message when input is not string nor instance of Error and fallbackMessage is not provided](x-pack/packages/kbn-cloud-security-posture-common/utils/helpers.test.ts) | it |  |  |
| [buildMutedRulesFilter Test](x-pack/packages/kbn-cloud-security-posture-common/utils/helpers.test.ts) | describe |  |  |
| [should return an empty array if no rules are muted](x-pack/packages/kbn-cloud-security-posture-common/utils/helpers.test.ts) | it |  |  |
| [should return the correct query for a single muted rule](x-pack/packages/kbn-cloud-security-posture-common/utils/helpers.test.ts) | it |  |  |
| [should return the correct queries for multiple muted rules](x-pack/packages/kbn-cloud-security-posture-common/utils/helpers.test.ts) | it |  |  |
</details>

## Directory: x-pack/plugins/cloud_security_posture

**Total Tests:** 463 | **Skipped:** 7 (1.51%) | **Todo:** 0 (0.00%)

![](https://img.shields.io/badge/UT-brightgreen) ![](https://img.shields.io/badge/HAS-SKIP-yellow)

<details>
<summary>Test Details</summary>

| Test Label | Type | Skipped | Todo |
|------------|------|---------|------|
| [Detection rules utils](x-pack/plugins/cloud_security_posture/common/utils/detection_rules.test.ts) | describe |  |  |
| [should convert tags to KQL format with AND operator](x-pack/plugins/cloud_security_posture/common/utils/detection_rules.test.ts) | it |  |  |
| [Should convert tags to KQL format with AND Operator (empty array)](x-pack/plugins/cloud_security_posture/common/utils/detection_rules.test.ts) | it |  |  |
| [should convert tags to KQL format with OR Operator](x-pack/plugins/cloud_security_posture/common/utils/detection_rules.test.ts) | it |  |  |
| [Should convert tags to KQL format with OR Operator  (empty array)](x-pack/plugins/cloud_security_posture/common/utils/detection_rules.test.ts) | it |  |  |
| [Should generate search tags for a CSP benchmark rule](x-pack/plugins/cloud_security_posture/common/utils/detection_rules.test.ts) | it |  |  |
| [Should handle undefined benchmark object gracefully](x-pack/plugins/cloud_security_posture/common/utils/detection_rules.test.ts) | it |  |  |
| [Should handle undefined rule number gracefully](x-pack/plugins/cloud_security_posture/common/utils/detection_rules.test.ts) | it |  |  |
| [Should generate search tags for a CSP benchmark rule given an array of Benchmarks](x-pack/plugins/cloud_security_posture/common/utils/detection_rules.test.ts) | it |  |  |
| [Should handle undefined benchmark object gracefully given an array of empty benchmark](x-pack/plugins/cloud_security_posture/common/utils/detection_rules.test.ts) | it |  |  |
| [Should generate tags for a CSPM benchmark rule](x-pack/plugins/cloud_security_posture/common/utils/detection_rules.test.ts) | it |  |  |
| [Should generate tags for a KSPM benchmark rule](x-pack/plugins/cloud_security_posture/common/utils/detection_rules.test.ts) | it |  |  |
| [test helper methods](x-pack/plugins/cloud_security_posture/common/utils/helpers.test.ts) | describe |  |  |
| [get default integration type from inputs with multiple enabled types](x-pack/plugins/cloud_security_posture/common/utils/helpers.test.ts) | it |  |  |
| [get default integration type from inputs without any enabled types](x-pack/plugins/cloud_security_posture/common/utils/helpers.test.ts) | it |  |  |
| [get EKS integration type](x-pack/plugins/cloud_security_posture/common/utils/helpers.test.ts) | it |  |  |
| [get Vanilla K8S integration type](x-pack/plugins/cloud_security_posture/common/utils/helpers.test.ts) | it |  |  |
| [get benchmark type filter based on a benchmark id](x-pack/plugins/cloud_security_posture/common/utils/helpers.test.ts) | it |  |  |
| [should return a string with the correct filter when given a benchmark type and section](x-pack/plugins/cloud_security_posture/common/utils/helpers.test.ts) | it |  |  |
| [get benchmark filter query based on a benchmark Id, version](x-pack/plugins/cloud_security_posture/common/utils/helpers.test.ts) | it |  |  |
| [get benchmark filter query based on a benchmark Id, version and multiple sections and rule numbers](x-pack/plugins/cloud_security_posture/common/utils/helpers.test.ts) | it |  |  |
| [get benchmark filter query based on a benchmark Id, version and just sections](x-pack/plugins/cloud_security_posture/common/utils/helpers.test.ts) | it |  |  |
| [get benchmark filter query based on a benchmark Id, version and just rule numbers](x-pack/plugins/cloud_security_posture/common/utils/helpers.test.ts) | it |  |  |
| [cleanupCredentials](x-pack/plugins/cloud_security_posture/common/utils/helpers.test.ts) | describe |  |  |
| [cleans unused aws credential methods, except role_arn when using assume_role](x-pack/plugins/cloud_security_posture/common/utils/helpers.test.ts) | it |  |  |
| [cleans unused aws credential methods, when using cloud formation](x-pack/plugins/cloud_security_posture/common/utils/helpers.test.ts) | it |  |  |
| [cleans unused aws credential methods, when using direct_access_keys method ](x-pack/plugins/cloud_security_posture/common/utils/helpers.test.ts) | it |  |  |
| [when aws credential type is undefined, return unchanged policy](x-pack/plugins/cloud_security_posture/common/utils/helpers.test.ts) | it |  |  |
| [cleans unused gcp credential methods, when using credentials-file method ](x-pack/plugins/cloud_security_posture/common/utils/helpers.test.ts) | it |  |  |
| [when gcp credential type is undefined, return unchanged policy](x-pack/plugins/cloud_security_posture/common/utils/helpers.test.ts) | it |  |  |
| [isSubscriptionAllowed](x-pack/plugins/cloud_security_posture/common/utils/subscription.test.ts) | describe |  |  |
| [should allow any cloud subscription](x-pack/plugins/cloud_security_posture/common/utils/subscription.test.ts) | it |  |  |
| [should allow enterprise and trial licenses for on-prem](x-pack/plugins/cloud_security_posture/common/utils/subscription.test.ts) | it |  |  |
| [should not allow enterprise and trial licenses for on-prem](x-pack/plugins/cloud_security_posture/common/utils/subscription.test.ts) | it |  |  |
| [CspRouter](x-pack/plugins/cloud_security_posture/public/application/csp_router.test.tsx) | describe |  |  |
| [happy path](x-pack/plugins/cloud_security_posture/public/application/csp_router.test.tsx) | describe |  |  |
| [should render Findings](x-pack/plugins/cloud_security_posture/public/application/csp_router.test.tsx) | it |  |  |
| [should render Dashboards](x-pack/plugins/cloud_security_posture/public/application/csp_router.test.tsx) | it |  |  |
| [should render the Vulnerability Dashboard](x-pack/plugins/cloud_security_posture/public/application/csp_router.test.tsx) | it |  |  |
| [should render Benchmarks](x-pack/plugins/cloud_security_posture/public/application/csp_router.test.tsx) | it |  |  |
| [should render Rules](x-pack/plugins/cloud_security_posture/public/application/csp_router.test.tsx) | it |  |  |
| [unhappy path](x-pack/plugins/cloud_security_posture/public/application/csp_router.test.tsx) | describe |  |  |
| [should redirect base path to dashboard](x-pack/plugins/cloud_security_posture/public/application/csp_router.test.tsx) | it |  |  |
| [CspRoute](x-pack/plugins/cloud_security_posture/public/application/csp_router.test.tsx) | describe |  |  |
| [should not render disabled path](x-pack/plugins/cloud_security_posture/public/application/csp_router.test.tsx) | it |  |  |
| [should render SpyRoute for static paths](x-pack/plugins/cloud_security_posture/public/application/csp_router.test.tsx) | it |  |  |
| [should not render SpyRoute for dynamic paths](x-pack/plugins/cloud_security_posture/public/application/csp_router.test.tsx) | it |  |  |
| [useBenchmarkDynamicValues](x-pack/plugins/cloud_security_posture/public/common/hooks/use_benchmark_dynamic_values.test.ts) | describe |  |  |
| [should return the correct dynamic benchmark values for each provided benchmark ID](x-pack/plugins/cloud_security_posture/public/common/hooks/use_benchmark_dynamic_values.test.ts) | it |  |  |
| [should return the correct resource plurals based on the provided resource count](x-pack/plugins/cloud_security_posture/public/common/hooks/use_benchmark_dynamic_values.test.ts) | it |  |  |
| [useNavigateFindings](x-pack/plugins/cloud_security_posture/public/common/hooks/use_navigate_findings.test.ts) | describe |  |  |
| [creates a URL to findings page with correct path, filter and dataViewId](x-pack/plugins/cloud_security_posture/public/common/hooks/use_navigate_findings.test.ts) | it |  |  |
| [creates a URL to findings page with correct path and negated filter](x-pack/plugins/cloud_security_posture/public/common/hooks/use_navigate_findings.test.ts) | it |  |  |
| [creates a URL to vulnerabilities page with correct path, filter and dataViewId](x-pack/plugins/cloud_security_posture/public/common/hooks/use_navigate_findings.test.ts) | it |  |  |
| [useUrlQuery](x-pack/plugins/cloud_security_posture/public/common/hooks/use_url_query.test.ts) | describe |  |  |
| [uses default query when no query is provided](x-pack/plugins/cloud_security_posture/public/common/hooks/use_url_query.test.ts) | it |  |  |
| [merges default query, partial first query and partial second query](x-pack/plugins/cloud_security_posture/public/common/hooks/use_url_query.test.ts) | it |  |  |
| [getSecuritySolutionLink](x-pack/plugins/cloud_security_posture/public/common/navigation/security_solution_links.test.ts) | describe |  |  |
| [gets the correct link properties](x-pack/plugins/cloud_security_posture/public/common/navigation/security_solution_links.test.ts) | it |  |  |
| [getAbbreviatedNumber](x-pack/plugins/cloud_security_posture/public/common/utils/get_abbreviated_number.test.ts) | describe |  |  |
| [should return the same value if it is less than 1000](x-pack/plugins/cloud_security_posture/public/common/utils/get_abbreviated_number.test.ts) | it |  |  |
| [should use numeral to format the value if it is greater than or equal to 1000](x-pack/plugins/cloud_security_posture/public/common/utils/get_abbreviated_number.test.ts) | it |  |  |
| [should return 0 if the value is NaN](x-pack/plugins/cloud_security_posture/public/common/utils/get_abbreviated_number.test.ts) | it |  |  |
| [getCvsScoreColor](x-pack/plugins/cloud_security_posture/public/common/utils/get_vulnerabiltity_colors.test.ts) | describe |  |  |
| [returns correct color for low severity score](x-pack/plugins/cloud_security_posture/public/common/utils/get_vulnerabiltity_colors.test.ts) | it |  |  |
| [returns correct color for medium severity score](x-pack/plugins/cloud_security_posture/public/common/utils/get_vulnerabiltity_colors.test.ts) | it |  |  |
| [returns correct color for high severity score](x-pack/plugins/cloud_security_posture/public/common/utils/get_vulnerabiltity_colors.test.ts) | it |  |  |
| [returns correct color for critical severity score](x-pack/plugins/cloud_security_posture/public/common/utils/get_vulnerabiltity_colors.test.ts) | it |  |  |
| [returns correct color for low severity score for undefined value](x-pack/plugins/cloud_security_posture/public/common/utils/get_vulnerabiltity_colors.test.ts) | it |  |  |
| [getSeverityStatusColor](x-pack/plugins/cloud_security_posture/public/common/utils/get_vulnerabiltity_colors.test.ts) | describe |  |  |
| [should return the correct color for LOW severity](x-pack/plugins/cloud_security_posture/public/common/utils/get_vulnerabiltity_colors.test.ts) | it |  |  |
| [should return the correct color for MEDIUM severity](x-pack/plugins/cloud_security_posture/public/common/utils/get_vulnerabiltity_colors.test.ts) | it |  |  |
| [should return the correct color for HIGH severity](x-pack/plugins/cloud_security_posture/public/common/utils/get_vulnerabiltity_colors.test.ts) | it |  |  |
| [should return the correct color for CRITICAL severity](x-pack/plugins/cloud_security_posture/public/common/utils/get_vulnerabiltity_colors.test.ts) | it |  |  |
| [should return #aaa for an unknown severity](x-pack/plugins/cloud_security_posture/public/common/utils/get_vulnerabiltity_colors.test.ts) | it |  |  |
| [AccountsEvaluatedWidget](x-pack/plugins/cloud_security_posture/public/components/accounts_evaluated_widget.test.tsx) | describe |  |  |
| [renders the component with benchmark data correctly](x-pack/plugins/cloud_security_posture/public/components/accounts_evaluated_widget.test.tsx) | it |  |  |
| [calls navToFindingsByCloudProvider when a benchmark with provider is clicked](x-pack/plugins/cloud_security_posture/public/components/accounts_evaluated_widget.test.tsx) | it |  |  |
| [calls navToFindingsByCisBenchmark when a benchmark with benchmarkId is clicked](x-pack/plugins/cloud_security_posture/public/components/accounts_evaluated_widget.test.tsx) | it |  |  |
| [<ChartPanel />](x-pack/plugins/cloud_security_posture/public/components/chart_panel.test.tsx) | describe |  |  |
| [renders loading state](x-pack/plugins/cloud_security_posture/public/components/chart_panel.test.tsx) | it |  |  |
| [renders error state](x-pack/plugins/cloud_security_posture/public/components/chart_panel.test.tsx) | it |  |  |
| [renders chart component](x-pack/plugins/cloud_security_posture/public/components/chart_panel.test.tsx) | it |  |  |
| [<CloudPosturePage />](x-pack/plugins/cloud_security_posture/public/components/cloud_posture_page.test.tsx) | describe |  |  |
| [renders children if setup status is indexed](x-pack/plugins/cloud_security_posture/public/components/cloud_posture_page.test.tsx) | it |  |  |
| [renders default loading text when query isLoading](x-pack/plugins/cloud_security_posture/public/components/cloud_posture_page.test.tsx) | it |  |  |
| [renders default loading text when query is idle](x-pack/plugins/cloud_security_posture/public/components/cloud_posture_page.test.tsx) | it |  |  |
| [renders default error texts when query isError](x-pack/plugins/cloud_security_posture/public/components/cloud_posture_page.test.tsx) | it |  |  |
| [prefers custom error render](x-pack/plugins/cloud_security_posture/public/components/cloud_posture_page.test.tsx) | it |  |  |
| [prefers custom loading render](x-pack/plugins/cloud_security_posture/public/components/cloud_posture_page.test.tsx) | it |  |  |
| [renders no data prompt when query data is undefined](x-pack/plugins/cloud_security_posture/public/components/cloud_posture_page.test.tsx) | it |  |  |
| [prefers custom no data prompt](x-pack/plugins/cloud_security_posture/public/components/cloud_posture_page.test.tsx) | it |  |  |
| [CloudSecurityDataTable](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/cloud_security_data_table.test.tsx) | describe |  |  |
| [renders loading state](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/cloud_security_data_table.test.tsx) | it |  |  |
| [renders empty state when no rows are present](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/cloud_security_data_table.test.tsx) | it |  |  |
| [renders data table with rows](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/cloud_security_data_table.test.tsx) | it |  |  |
| [renders data table with actions button](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/cloud_security_data_table.test.tsx) | it |  |  |
| [renders data table without actions button](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/cloud_security_data_table.test.tsx) | it |  |  |
| [FieldsSelectorTable](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | describe |  |  |
| [renders the table with data correctly](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | it |  |  |
| [calls onAddColumn when a checkbox is checked](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | it |  |  |
| [calls onRemoveColumn when a checkbox is unchecked](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | it |  |  |
| [View selected](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | describe |  |  |
| [should show "view all" option by default](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | it |  |  |
| [should render "view selected" option when previous selection was "view selected"](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | it |  |  |
| [should show "view all" option after the "view all" is selected](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | it |  |  |
| [should show only selected columns after the "view selected" option is selected](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | it |  |  |
| [should show all columns available after the "view all" option is selected](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | it |  |  |
| [should open the view selector with button click](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | it |  |  |
| [Searching columns](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | describe |  |  |
| [should find all columns match the search term](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | it |  |  |
| [should find all columns match the search term and are selected](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | it |  |  |
| [firstNonNullValue](x-pack/plugins/cloud_security_posture/public/components/cloud_security_grouping/utils/first_non_null_value.test.ts) | describe |  |  |
| [returns the value itself for non-null single value](x-pack/plugins/cloud_security_posture/public/components/cloud_security_grouping/utils/first_non_null_value.test.ts) | it |  |  |
| [returns undefined for a null single value](x-pack/plugins/cloud_security_posture/public/components/cloud_security_grouping/utils/first_non_null_value.test.ts) | it |  |  |
| [returns undefined for an array of all null values](x-pack/plugins/cloud_security_posture/public/components/cloud_security_grouping/utils/first_non_null_value.test.ts) | it |  |  |
| [returns the first non-null value in an array of mixed values](x-pack/plugins/cloud_security_posture/public/components/cloud_security_grouping/utils/first_non_null_value.test.ts) | it |  |  |
| [returns the first value in an array of all non-null values](x-pack/plugins/cloud_security_posture/public/components/cloud_security_grouping/utils/first_non_null_value.test.ts) | it |  |  |
| [returns undefined for an empty array](x-pack/plugins/cloud_security_posture/public/components/cloud_security_grouping/utils/first_non_null_value.test.ts) | it |  |  |
| [DetectionRuleCounter](x-pack/plugins/cloud_security_posture/public/components/detection_rule_counter.test.tsx) | describe |  |  |
| [should render loading skeleton when both rules and alerts are loading](x-pack/plugins/cloud_security_posture/public/components/detection_rule_counter.test.tsx) | it |  |  |
| [should render create rule link when no rules exist](x-pack/plugins/cloud_security_posture/public/components/detection_rule_counter.test.tsx) | it |  |  |
| [should render alert and rule count when rules exist](x-pack/plugins/cloud_security_posture/public/components/detection_rule_counter.test.tsx) | it |  |  |
| [should show loading spinner when creating a rule](x-pack/plugins/cloud_security_posture/public/components/detection_rule_counter.test.tsx) | it |  |  |
| [<CspPolicyTemplateForm />](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | describe |  |  |
| [shows license block if subscription is not allowed](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [license block renders with license url locator](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [license block renders without license url locator](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [updates package policy namespace to default when it changes](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders and updates name field](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders and updates description field](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders KSPM input selector](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [updates selected KSPM input](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders CSPM input selector](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders disabled KSPM input when editing](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders disabled CSPM input when editing](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [selects default KSPM input selector](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [selects default VULN_MGMT input selector](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [selects default CSPM input selector](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [K8S](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | describe |  |  |
| [K8S or KSPM Vanilla should not render any Setup Access option](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [EKS Credentials input fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | describe |  |  |
| [documentation Hyperlink should have correct URL to redirect users to AWS page](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders ${CLOUDBEAT_EKS} Assume Role fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [updates ${CLOUDBEAT_EKS} Assume Role fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders ${CLOUDBEAT_EKS} Direct Access Keys fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [updates ${CLOUDBEAT_EKS} Direct Access Keys fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders ${CLOUDBEAT_EKS} Temporary Keys fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [updates ${CLOUDBEAT_EKS} Temporary Keys fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders ${CLOUDBEAT_EKS} Shared Credentials fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [updates ${CLOUDBEAT_EKS} Shared Credentials fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [AWS Credentials input fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | describe |  |  |
| [renders ${CLOUDBEAT_AWS} Account Type field, AWS Organization is enabled for supported versions](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [${CLOUDBEAT_AWS} form displays upgrade message for unsupported versions and aws organization option is disabled](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [${CLOUDBEAT_AWS} form do not displays upgrade message for supported versions and aws organization option is enabled](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [Getting started Hyperlink should have correct URL to redirect users to elastic page](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [documentation Hyperlink should have correct URL to redirect users to elastic page if user chose Manual](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [documentation Hyperlink should have correct URL to redirect users to AWS page if user chose Cloudformation](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders ${CLOUDBEAT_AWS} Assume Role fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [updates ${CLOUDBEAT_AWS} Assume Role fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders ${CLOUDBEAT_AWS} Direct Access Keys fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [updates ${CLOUDBEAT_AWS} Direct Access Keys fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders ${CLOUDBEAT_AWS} Temporary Keys fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [updates ${CLOUDBEAT_AWS} Temporary Keys fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders ${CLOUDBEAT_AWS} Shared Credentials fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [updates ${CLOUDBEAT_AWS} Shared Credentials fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [Vuln Mgmt](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | describe |  |  |
| [Update Agent Policy CloudFormation template from vars](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [Additional Charge Callout message should be rendered](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [GCP Credentials input fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | describe |  |  |
| [renders ${CLOUDBEAT_GCP} Not supported when version is not at least version 1.5.2](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [documentation Hyperlink should have correct URL to redirect users to elastic page](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders Google Cloud Shell forms when Setup Access is set to Google Cloud Shell](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders ${CLOUDBEAT_GCP} Credentials File fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [updates ${CLOUDBEAT_GCP} Credentials File fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [${CLOUDBEAT_GCP} form do not displays upgrade message for supported versions and gcp organization option is enabled](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders ${CLOUDBEAT_GCP} Organization fields when account type is Organization and Setup Access is Google Cloud Shell](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders ${CLOUDBEAT_GCP} Organization fields when account type is Organization and Setup Access is manual](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [Should not render ${CLOUDBEAT_GCP} Organization fields when account type is Single](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [updates ${CLOUDBEAT_GCP} organization id](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [Azure Credentials input fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | describe |  |  |
| [renders ${CLOUDBEAT_AZURE} Not supported when version is not at least version 1.6.0](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [doesnt render ${CLOUDBEAT_AZURE} Manual fields when version is not at least version 1.7.0](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [selects default ${CLOUDBEAT_AZURE} fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders ${CLOUDBEAT_AZURE} Service Principal with Client Secret fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [updates ${CLOUDBEAT_AZURE} Service Principal with Client Secret fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [Agentless](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | describe |  |  |
| [should not render setup technology selector if agentless is not available and CSPM integration supports agentless](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [should render setup technology selector for AWS and allow to select agentless](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [should render setup technology selector for GCP for organisation account type](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [should render setup technology selector for GCP for single-account](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [should render setup technology selector for Azure for Organisation type](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [should render setup technology selector for Azure for Single Subscription type](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [should not render setup technology selector for KSPM](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [should not render setup technology selector for CNVM](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders Service principal with Client Certificate fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [updates Service principal with Client Certificate fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [should not render Service principal with Client Username and Password option](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders Service principal with Client Username and Password fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [updates Service principal with Client Username and Password fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [useSetupTechnology](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | describe |  |  |
| [create page flow](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | describe |  |  |
| [initializes with AGENT_BASED technology](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | it |  |  |
| [sets to AGENT-BASED when agentless is available and AWS cloud](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | it |  |  |
| [sets to AGENT-BASED when agentless is available and GCP cloud](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | it |  |  |
| [sets to AGENT-BASED when agentless is available and Azure cloud](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | it |  |  |
| [sets to AGENT_BASED when agentless is available but input is not supported for agentless](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | it |  |  |
| [sets to AGENT_BASED when isAgentlessEnabled is false](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | it |  |  |
| [calls handleSetupTechnologyChange when setupTechnology changes](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | it |  |  |
| [edit page flow](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | describe |  |  |
| [initializes with AGENT_BASED technology](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | it |  |  |
| [initializes with agentless when is in edit mode and is agentless selected](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | it |  |  |
| [should not call handleSetupTechnologyChange when setupTechnology changes](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | it |  |  |
| [should not update setupTechnology when agentlessPolicyId becomes available](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | it |  |  |
| [getPosturePolicy](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | describe |  |  |
| [updates package policy with hidden vars for ${name}](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [updates package policy required vars (posture/deployment)](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [updates package policy with a single enabled input](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should correctly increment cspm package name](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should return correctly increment vuln_mgmt package name](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should return correctly increment kspm package name](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should return package name with -1 when no matching package policies are found](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should return empty string when policy_templates is missing](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should return empty string when policy_templates.name is not cspm](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should return empty string when policy_templates.inputs is missing](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should return empty string when policy_templates.inputs is empty](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should return empty string when policy_templates.inputs is undefined](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should return empty string when policy_templates.inputs.vars does not have cloud_shell_url](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should return empty string when policy_templates.inputs.varshave cloud_shell_url but no default](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should cloud shell url when policy_templates.inputs.vars have cloud_shell_url](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should return "direct_access_key" for agentless](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should return "assume_role" for agent-based, when cloudformation is not available](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should return "cloud_formation" for agent-based, when cloudformation is available](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should return "service_principal_with_client_secret" for agentless](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [shold return "arm_template" for agent-based, when arm_template is available](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should return "managed_identity" for agent-based, when arm_template is not available](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should return manual credentials-json credentials type for agentless](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should return google_cloud_shell setup access for agent-based if cloud_shell_url is available](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [should return manual setup access for agent-based if cloud_shell_url is not available](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [Should return var item when key exist](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [Should return undefined when key is invalid](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [Should return undefined when datastream is undefined](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [Should return undefined when stream is undefined](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [Should return undefined when stream.var is invalid](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/utils.test.ts) | it |  |  |
| [NoFindingsStates](x-pack/plugins/cloud_security_posture/public/components/no_findings_states/no_findings_states.test.tsx) | describe |  |  |
| [shows integrations installation prompt with installation links when integration is not-installed](x-pack/plugins/cloud_security_posture/public/components/no_findings_states/no_findings_states.test.tsx) | it |  |  |
| [shows install agent prompt with install agent link when status is not-deployed](x-pack/plugins/cloud_security_posture/public/components/no_findings_states/no_findings_states.test.tsx) | it |  |  |
| [shows install agent prompt with install agent link when status is not-deployed and postureType is KSPM](x-pack/plugins/cloud_security_posture/public/components/no_findings_states/no_findings_states.test.tsx) | it |  |  |
| [shows indexing message when status is indexing](x-pack/plugins/cloud_security_posture/public/components/no_findings_states/no_findings_states.test.tsx) | it |  |  |
| [shows timeout message when status is index-timeout](x-pack/plugins/cloud_security_posture/public/components/no_findings_states/no_findings_states.test.tsx) | it |  |  |
| [shows unprivileged message when status is unprivileged](x-pack/plugins/cloud_security_posture/public/components/no_findings_states/no_findings_states.test.tsx) | it |  |  |
| [renders empty container when the status does not match a no finding status](x-pack/plugins/cloud_security_posture/public/components/no_findings_states/no_findings_states.test.tsx) | it |  |  |
| [<BenchmarksTable />](x-pack/plugins/cloud_security_posture/public/pages/benchmarks/benchmarks_table.test.tsx) | describe |  |  |
| [renders cis integration name](x-pack/plugins/cloud_security_posture/public/pages/benchmarks/benchmarks_table.test.tsx) | it |  |  |
| [renders benchmark version](x-pack/plugins/cloud_security_posture/public/pages/benchmarks/benchmarks_table.test.tsx) | it |  |  |
| [renders applicable to](x-pack/plugins/cloud_security_posture/public/pages/benchmarks/benchmarks_table.test.tsx) | it |  |  |
| [renders evaluated](x-pack/plugins/cloud_security_posture/public/pages/benchmarks/benchmarks_table.test.tsx) | it |  |  |
| [renders compliance](x-pack/plugins/cloud_security_posture/public/pages/benchmarks/benchmarks_table.test.tsx) | it |  |  |
| [<Benchmarks />](x-pack/plugins/cloud_security_posture/public/pages/benchmarks/benchmarks.test.tsx) | describe |  |  |
| [renders the page header](x-pack/plugins/cloud_security_posture/public/pages/benchmarks/benchmarks.test.tsx) | it |  |  |
| [renders the "add integration" button](x-pack/plugins/cloud_security_posture/public/pages/benchmarks/benchmarks.test.tsx) | it |  |  |
| [renders error state while there is an error](x-pack/plugins/cloud_security_posture/public/pages/benchmarks/benchmarks.test.tsx) | it |  |  |
| [renders the benchmarks table](x-pack/plugins/cloud_security_posture/public/pages/benchmarks/benchmarks.test.tsx) | it |  |  |
| [getTopRisks](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_charts/risks_table.test.ts) | describe |  |  |
| [returns sorted by posture score](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_charts/risks_table.test.ts) | it |  |  |
| [return sorted array with the correct number of elements](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_charts/risks_table.test.ts) | it |  |  |
| [<ComplianceDashboard />](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | describe |  |  |
| [shows package not installed page instead of tabs](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [no findings state: not-deployed - shows NotDeployed instead of dashboard](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [no findings state: indexing - shows Indexing instead of dashboard](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [no findings state: indexing - shows Indexing instead of dashboard when waiting_for_results](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [no findings state: index-timeout - shows IndexTimeout instead of dashboard](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [no findings state: unprivileged - shows Unprivileged instead of dashboard](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [shows dashboard when there are findings in latest findings index](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [Show Kubernetes dashboard if there are KSPM findings](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [Show Cloud dashboard if there are CSPM findings](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [Show Cloud dashboard "no findings prompt" if the CSPM integration is installed without findings](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [Show Kubernetes dashboard "no findings prompt" if the KSPM integration is installed without findings](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [Prefer Cloud dashboard if both integration are installed](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [Prefer Cloud dashboard if both integration have findings](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [Show CSPM installation prompt if CSPM is not installed and KSPM is installed ,NO AGENT](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [Show KSPM installation prompt if KSPM is not installed and CSPM is installed , NO AGENT](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [getDefaultTab](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | describe |  |  |
| [returns CSPM tab if only CSPM has findings](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [returns CSPM tab if both CSPM and KSPM has findings](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [returns KSPM tab if only KSPM has findings](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [when no findings preffers CSPM tab unless not-installed or unprivileged](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [should returns undefined when plugin status and cspm stats is not provided](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [should return undefined is plugin status and csp status is not provided ](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [should return undefined when  plugins status or cspm stats data is not provided](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/compliance_dashboard.test.tsx) | it |  |  |
| [<BenchmarksSection />](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/dashboard_sections/benchmarks_section.test.tsx) | describe |  |  |
| [Sorting](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/dashboard_sections/benchmarks_section.test.tsx) | describe |  |  |
| [sorts by ascending order of compliance scores](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/dashboard_sections/benchmarks_section.test.tsx) | it |  |  |
| [toggles sort order when clicking Posture Score](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/dashboard_sections/benchmarks_section.test.tsx) | it |  |  |
| [<CloudSummarySection />](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/dashboard_sections/summary_section.test.tsx) | describe |  |  |
| [renders all counter cards](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/dashboard_sections/summary_section.test.tsx) | it |  |  |
| [renders counters content according to mock](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/dashboard_sections/summary_section.test.tsx) | it |  |  |
| [renders counters value in compact abbreviation if its above one million](x-pack/plugins/cloud_security_posture/public/pages/compliance_dashboard/dashboard_sections/summary_section.test.tsx) | it |  |  |
| [<Findings />](x-pack/plugins/cloud_security_posture/public/pages/configurations/configurations.test.tsx) | describe |  |  |
| [renders integrations installation prompt if integration is not installed and there are no findings](x-pack/plugins/cloud_security_posture/public/pages/configurations/configurations.test.tsx) | it |  |  |
| [SearchBar](x-pack/plugins/cloud_security_posture/public/pages/configurations/configurations.test.tsx) | describe |  |  |
| [set search query](x-pack/plugins/cloud_security_posture/public/pages/configurations/configurations.test.tsx) | it |  |  |
| [renders no results message and reset button when search query does not match](x-pack/plugins/cloud_security_posture/public/pages/configurations/configurations.test.tsx) | it |  |  |
| [add filter](x-pack/plugins/cloud_security_posture/public/pages/configurations/configurations.test.tsx) | it |  |  |
| [remove filter](x-pack/plugins/cloud_security_posture/public/pages/configurations/configurations.test.tsx) | it |  |  |
| [DistributionBar](x-pack/plugins/cloud_security_posture/public/pages/configurations/configurations.test.tsx) | describe |  |  |
| [renders the distribution bar](x-pack/plugins/cloud_security_posture/public/pages/configurations/configurations.test.tsx) | it |  |  |
| [filters by passed findings when clicking on the passed findings button](x-pack/plugins/cloud_security_posture/public/pages/configurations/configurations.test.tsx) | it |  |  |
| [filters by failed findings when clicking on the failed findings button](x-pack/plugins/cloud_security_posture/public/pages/configurations/configurations.test.tsx) | it |  |  |
| [<FindingsFlyout/>](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | describe |  |  |
| [Overview Tab](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | describe |  |  |
| [details and remediation accordions are open](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | it |  |  |
| [displays text details summary info](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | it |  |  |
| [displays missing info callout when data source is not CSP](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | it |  |  |
| [does not display missing info callout when data source is CSP](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | it |  |  |
| [Rule Tab](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | describe |  |  |
| [displays rule text details](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | it |  |  |
| [displays missing info callout when data source is not CSP](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | it |  |  |
| [does not display missing info callout when data source is CSP](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | it |  |  |
| [Table Tab](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | describe |  |  |
| [displays resource name and id](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | it |  |  |
| [does not display missing info callout for 3Ps](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | it |  |  |
| [JSON Tab](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | describe |  |  |
| [does not display missing info callout for 3Ps](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | it |  |  |
| [should allow pagination with next](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | it |  |  |
| [should allow pagination with previous](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | it |  |  |
| [Get Filters](x-pack/plugins/cloud_security_posture/public/pages/configurations/utils/get_filters.test.ts) | describe |  |  |
| [negate an existing filter](x-pack/plugins/cloud_security_posture/public/pages/configurations/utils/get_filters.test.ts) | it |  |  |
| [<RulesContainer />](x-pack/plugins/cloud_security_posture/public/pages/rules/rules_container.test.tsx) | describe |  |  |
| [displays rules with their initial state](x-pack/plugins/cloud_security_posture/public/pages/rules/rules_container.test.tsx) | it |  |  |
| [<Rules />](x-pack/plugins/cloud_security_posture/public/pages/rules/rules.test.tsx) | describe |  |  |
| [calls Benchmark API](x-pack/plugins/cloud_security_posture/public/pages/rules/rules.test.tsx) | it |  |  |
| [Display success state when result request is resolved](x-pack/plugins/cloud_security_posture/public/pages/rules/rules.test.tsx) | it |  |  |
| [use_change_csp_rule_state](x-pack/plugins/cloud_security_posture/public/pages/rules/use_change_csp_rule_state.test.tsx) | describe |  |  |
| [should call http.post with the correct parameters](x-pack/plugins/cloud_security_posture/public/pages/rules/use_change_csp_rule_state.test.tsx) | it |  |  |
| [should cancel queries and update query data onMutate](x-pack/plugins/cloud_security_posture/public/pages/rules/use_change_csp_rule_state.test.tsx) | it |  |  |
| [should invalidate queries onSettled](x-pack/plugins/cloud_security_posture/public/pages/rules/use_change_csp_rule_state.test.tsx) | it |  |  |
| [should restore previous query data onError](x-pack/plugins/cloud_security_posture/public/pages/rules/use_change_csp_rule_state.test.tsx) | it |  |  |
| [creates the new set of cache rules in a muted state when calling createRulesWithUpdatedState](x-pack/plugins/cloud_security_posture/public/pages/rules/use_change_csp_rule_state.test.tsx) | it |  |  |
| [creates the new cache with rules in a unmute state](x-pack/plugins/cloud_security_posture/public/pages/rules/use_change_csp_rule_state.test.tsx) | it |  |  |
| [<VulnerabilityFindingFlyout/>](x-pack/plugins/cloud_security_posture/public/pages/vulnerabilities/vulnerabilities_finding_flyout/vulnerability_finding_flyout.test.tsx) | describe |  |  |
| [Header Info](x-pack/plugins/cloud_security_posture/public/pages/vulnerabilities/vulnerabilities_finding_flyout/vulnerability_finding_flyout.test.tsx) | describe |  |  |
| [displays text details flyout header  info](x-pack/plugins/cloud_security_posture/public/pages/vulnerabilities/vulnerabilities_finding_flyout/vulnerability_finding_flyout.test.tsx) | it |  |  |
| [JSON Tab](x-pack/plugins/cloud_security_posture/public/pages/vulnerabilities/vulnerabilities_finding_flyout/vulnerability_finding_flyout.test.tsx) | describe |  |  |
| [show display Vulnerability JSON Tab](x-pack/plugins/cloud_security_posture/public/pages/vulnerabilities/vulnerabilities_finding_flyout/vulnerability_finding_flyout.test.tsx) | it |  |  |
| [Overview Summary Details Tab](x-pack/plugins/cloud_security_posture/public/pages/vulnerabilities/vulnerabilities_finding_flyout/vulnerability_finding_flyout.test.tsx) | describe |  |  |
| [show display Vulnerability details in a Overview Tab](x-pack/plugins/cloud_security_posture/public/pages/vulnerabilities/vulnerabilities_finding_flyout/vulnerability_finding_flyout.test.tsx) | it |  |  |
| [show empty state for no fixes](x-pack/plugins/cloud_security_posture/public/pages/vulnerabilities/vulnerabilities_finding_flyout/vulnerability_finding_flyout.test.tsx) | it |  |  |
| [Flyout Pagination](x-pack/plugins/cloud_security_posture/public/pages/vulnerabilities/vulnerabilities_finding_flyout/vulnerability_finding_flyout.test.tsx) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [should allow pagination with next](x-pack/plugins/cloud_security_posture/public/pages/vulnerabilities/vulnerabilities_finding_flyout/vulnerability_finding_flyout.test.tsx) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [should allow pagination with previous](x-pack/plugins/cloud_security_posture/public/pages/vulnerabilities/vulnerabilities_finding_flyout/vulnerability_finding_flyout.test.tsx) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [<Vulnerabilities />](x-pack/plugins/cloud_security_posture/public/pages/vulnerabilities/vulnerabilties.test.tsx) | describe |  |  |
| [No vulnerabilities  state: not-deployed - shows NotDeployed instead of vulnerabilities ](x-pack/plugins/cloud_security_posture/public/pages/vulnerabilities/vulnerabilties.test.tsx) | it |  |  |
| [No vulnerabilities  state: indexing - shows Indexing instead of vulnerabilities ](x-pack/plugins/cloud_security_posture/public/pages/vulnerabilities/vulnerabilties.test.tsx) | it |  |  |
| [No vulnerabilities  state: index-timeout - shows IndexTimeout instead of vulnerabilities ](x-pack/plugins/cloud_security_posture/public/pages/vulnerabilities/vulnerabilties.test.tsx) | it |  |  |
| [No vulnerabilities  state: unprivileged - shows Unprivileged instead of vulnerabilities ](x-pack/plugins/cloud_security_posture/public/pages/vulnerabilities/vulnerabilties.test.tsx) | it |  |  |
| [renders vuln_mgmt integrations installation prompt if vuln_mgmt integration is not installed](x-pack/plugins/cloud_security_posture/public/pages/vulnerabilities/vulnerabilties.test.tsx) | it |  |  |
| [<VulnerabilityDashboard />](x-pack/plugins/cloud_security_posture/public/pages/vulnerability_dashboard/vulnerability_dashboard.test.tsx) | describe |  |  |
| [renders vuln_mgmt integrations installation prompt if vuln_mgmt integration is not installed](x-pack/plugins/cloud_security_posture/public/pages/vulnerability_dashboard/vulnerability_dashboard.test.tsx) | it |  |  |
| [No vulnerabilities  state: not-deployed - shows NotDeployed instead of vulnerabilities ](x-pack/plugins/cloud_security_posture/public/pages/vulnerability_dashboard/vulnerability_dashboard.test.tsx) | it |  |  |
| [No vulnerabilities  state: indexing - shows Indexing instead of vulnerabilities ](x-pack/plugins/cloud_security_posture/public/pages/vulnerability_dashboard/vulnerability_dashboard.test.tsx) | it |  |  |
| [No vulnerabilities  state: index-timeout - shows IndexTimeout instead of vulnerabilities ](x-pack/plugins/cloud_security_posture/public/pages/vulnerability_dashboard/vulnerability_dashboard.test.tsx) | it |  |  |
| [No vulnerabilities  state: unprivileged - shows Unprivileged instead of vulnerabilities ](x-pack/plugins/cloud_security_posture/public/pages/vulnerability_dashboard/vulnerability_dashboard.test.tsx) | it |  |  |
| [Vulnerabilities  state: indexed - renders dashboard container on indexed state ](x-pack/plugins/cloud_security_posture/public/pages/vulnerability_dashboard/vulnerability_dashboard.test.tsx) | it |  |  |
| [createBenchmarkScoreIndex](x-pack/plugins/cloud_security_posture/server/create_indices/create_indices.test.ts) | describe |  |  |
| [should delete old index template from prev verions first](x-pack/plugins/cloud_security_posture/server/create_indices/create_indices.test.ts) | it |  |  |
| [should create index template with the correct index pattern, index name and default ingest pipeline](x-pack/plugins/cloud_security_posture/server/create_indices/create_indices.test.ts) | it |  |  |
| [should create index template the correct index patter, index name and default ingest pipeline but without lifecycle in serverless](x-pack/plugins/cloud_security_posture/server/create_indices/create_indices.test.ts) | it |  |  |
| [should create index if does not exist](x-pack/plugins/cloud_security_posture/server/create_indices/create_indices.test.ts) | it |  |  |
| [should updat index mapping if index exists](x-pack/plugins/cloud_security_posture/server/create_indices/create_indices.test.ts) | it |  |  |
| [createTransformIfNotExist](x-pack/plugins/cloud_security_posture/server/create_transforms/create_transforms.test.ts) | describe |  |  |
| [expect not to create if already exists](x-pack/plugins/cloud_security_posture/server/create_transforms/create_transforms.test.ts) | it |  |  |
| [expect to create if does not already exist](x-pack/plugins/cloud_security_posture/server/create_transforms/create_transforms.test.ts) | it |  |  |
| [expect not to create if get error is not 404](x-pack/plugins/cloud_security_posture/server/create_transforms/create_transforms.test.ts) | it |  |  |
| [startTransformIfNotStarted](x-pack/plugins/cloud_security_posture/server/create_transforms/create_transforms.test.ts) | describe |  |  |
| [expect not to start if state is ${state}](x-pack/plugins/cloud_security_posture/server/create_transforms/create_transforms.test.ts) | it |  |  |
| [expect not to start if transform not found](x-pack/plugins/cloud_security_posture/server/create_transforms/create_transforms.test.ts) | it |  |  |
| [expect to start if state is stopped](x-pack/plugins/cloud_security_posture/server/create_transforms/create_transforms.test.ts) | it |  |  |
| [expect to attempt restart if state is failed](x-pack/plugins/cloud_security_posture/server/create_transforms/create_transforms.test.ts) | it |  |  |
| [Benchmark Field Key Functions](x-pack/plugins/cloud_security_posture/server/lib/mapping_field_util.test.ts) | describe |  |  |
| [toBenchmarkDocFieldKey should keep the same benchmark id and version key for benchmark document](x-pack/plugins/cloud_security_posture/server/lib/mapping_field_util.test.ts) | it |  |  |
| [toBenchmarkDocFieldKey should convert benchmark version with . delimiter correctly](x-pack/plugins/cloud_security_posture/server/lib/mapping_field_util.test.ts) | it |  |  |
| [toBenchmarkMappingFieldKey should convert benchmark version with _ delimiter correctly](x-pack/plugins/cloud_security_posture/server/lib/mapping_field_util.test.ts) | it |  |  |
| [toBenchmarkMappingFieldKey should handle benchmark version with dots correctly](x-pack/plugins/cloud_security_posture/server/lib/mapping_field_util.test.ts) | it |  |  |
| [MAPPING_VERSION_DELIMITER should be an underscore](x-pack/plugins/cloud_security_posture/server/lib/mapping_field_util.test.ts) | it |  |  |
| [Cloud Security Posture Plugin](x-pack/plugins/cloud_security_posture/server/plugin.test.ts) | describe |  |  |
| [start()](x-pack/plugins/cloud_security_posture/server/plugin.test.ts) | describe |  |  |
| [should initialize when package installed](x-pack/plugins/cloud_security_posture/server/plugin.test.ts) | it |  |  |
| [should not initialize when package is not installed](x-pack/plugins/cloud_security_posture/server/plugin.test.ts) | it |  |  |
| [should not initialize when other package is created](x-pack/plugins/cloud_security_posture/server/plugin.test.ts) | it |  |  |
| [packagePolicyPostCreate should return the same received policy](x-pack/plugins/cloud_security_posture/server/plugin.test.ts) | it |  |  |
| [getSortedCspBenchmarkRules](x-pack/plugins/cloud_security_posture/server/routes/benchmark_rules/find/find.test.ts) | describe |  |  |
| [sorts by metadata.benchmark.rule_number, invalid semantic version still should still get sorted and empty values should be sorted last](x-pack/plugins/cloud_security_posture/server/routes/benchmark_rules/find/find.test.ts) | it |  |  |
| [edge case - returns empty array if input is empty](x-pack/plugins/cloud_security_posture/server/routes/benchmark_rules/find/find.test.ts) | it |  |  |
| [edge case - returns sorted array even if input only has one element](x-pack/plugins/cloud_security_posture/server/routes/benchmark_rules/find/find.test.ts) | it |  |  |
| [returns sorted array even with undefined or null properties](x-pack/plugins/cloud_security_posture/server/routes/benchmark_rules/find/find.test.ts) | it |  |  |
| [returns sorted array with invalid semantic versions](x-pack/plugins/cloud_security_posture/server/routes/benchmark_rules/find/find.test.ts) | it |  |  |
| [benchmarks API](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | describe |  |  |
| [validate the API route path](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | it |  |  |
| [should accept to a user with fleet.all privilege](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | it |  |  |
| [should reject to a user without fleet.all privilege](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | it |  |  |
| [test input schema](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | describe |  |  |
| [expect to find default values](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | it |  |  |
| [expect to find package_policy_name](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | it |  |  |
| [should throw when page field is not a positive integer](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | it |  |  |
| [should throw when per_page field is not a positive integer](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | it |  |  |
| [should throw when sort_field is not string](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | it |  |  |
| [should not throw when sort_field is a string](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | it |  |  |
| [should throw when sort_order is not ](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | it |  |  |
| [should not throw when ](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | it |  |  |
| [should not throw when ](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | it |  |  |
| [should not throw when fields is a known string literal](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | it |  |  |
| [test benchmarks utils](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | describe |  |  |
| [test getAgentPolicies](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | describe |  |  |
| [should return one agent policy id when there is duplication](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | it |  |  |
| [should return full policy ids list when there is no id duplication](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | it |  |  |
| [test addPackagePolicyCspBenchmarkRule](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | describe |  |  |
| [should retrieve the rules count by the filtered benchmark type](x-pack/plugins/cloud_security_posture/server/routes/benchmarks/benchmarks.test.ts) | it |  |  |
| [compliance dashboard permissions API](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/compliance_dashboard.test.ts) | describe |  |  |
| [should accept to a user with fleet.all privilege](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/compliance_dashboard.test.ts) | it |  |  |
| [should reject to a user without fleet.all privilege](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/compliance_dashboard.test.ts) | it |  |  |
| [getBenchmarksFromAggs](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/get_benchmarks.test.ts) | describe |  |  |
| [should return value matching ComplianceDashboardDataV2["benchmarks"]](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/get_benchmarks.test.ts) | it |  |  |
| [getClustersFromAggs](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/get_clusters.test.ts) | describe |  |  |
| [should return value matching ComplianceDashboardData["clusters"]](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/get_clusters.test.ts) | it |  |  |
| [getPostureStatsFromAggs](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/get_grouped_findings_evaluation.test.ts) | describe |  |  |
| [should return value matching ComplianceDashboardData["resourcesTypes"]](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/get_grouped_findings_evaluation.test.ts) | it |  |  |
| [roundScore](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/get_stats.test.ts) | describe |  |  |
| [should return decimal values with one fraction digit](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/get_stats.test.ts) | it |  |  |
| [calculatePostureScore](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/get_stats.test.ts) | describe |  |  |
| [should return calculated posture score](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/get_stats.test.ts) | it |  |  |
| [getStatsFromFindingsEvaluationsAggs](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/get_stats.test.ts) | describe |  |  |
| [should throw error in case no findings were found](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/get_stats.test.ts) | it |  |  |
| [should return value matching ComplianceDashboardData["stats"]](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/get_stats.test.ts) | it |  |  |
| [checks for stability in case one of the values is zero](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/get_stats.test.ts) | it |  |  |
| [should return zero on all stats if there are no failed or passed findings](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/get_stats.test.ts) | it |  |  |
| [getTrendsFromQueryResult](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/get_trends.test.ts) | describe |  |  |
| [should return value matching Trends type definition, in descending order, and with postureScore](x-pack/plugins/cloud_security_posture/server/routes/compliance_dashboard/get_trends.test.ts) | it |  |  |
| [calculateIntegrationStatus for cspm](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | describe |  |  |
| [Verify status when CSP package is not installed](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | it |  |  |
| [Verify status when there are no permission for cspm](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | it |  |  |
| [Verify status when there are no findings, no healthy agents and no installed policy templates](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | it |  |  |
| [Verify status when there are findings and installed policies but no healthy agents](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | it |  |  |
| [Verify status when there are findings ,installed policies and healthy agents](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | it |  |  |
| [Verify status when there are no findings ,installed policies and no healthy agents](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | it |  |  |
| [Verify status when there are installed policies, healthy agents and no findings](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | it |  |  |
| [Verify status when there are installed policies, healthy agents and no findings and been more than 10 minutes](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | it |  |  |
| [Verify status when there are installed policies, healthy agents past findings but no recent findings](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | it |  |  |
| [calculateIntegrationStatus for vul_mgmt](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | describe |  |  |
| [Verify status when there are no permission for vul_mgmt](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | it |  |  |
| [Verify status when there are no vul_mgmt findings, no healthy agents and no installed policy templates](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | it |  |  |
| [Verify status when there are vul_mgmt findings and installed policies but no healthy agents](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | it |  |  |
| [Verify status when there are vul_mgmt findings ,installed policies and healthy agents](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | it |  |  |
| [Verify status when there are no vul_mgmt findings ,installed policies and no healthy agents](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | it |  |  |
| [Verify status when there are installed policies, healthy agents and no vul_mgmt findings](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | it |  |  |
| [Verify status when there are installed policies, healthy agents and no vul_mgmt findings and been more than 10 minutes](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | it |  |  |
| [Verify status when there are installed policies, healthy agents and no vul_mgmt findings and been more than 1 hour](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | it |  |  |
| [Verify status when there are installed policies, healthy agents past vul_mgmt findings but no recent findings](x-pack/plugins/cloud_security_posture/server/routes/status/status.test.ts) | it |  |  |
| [finding stats task state](x-pack/plugins/cloud_security_posture/server/tasks/task_state.test.ts) | describe |  |  |
| [v1](x-pack/plugins/cloud_security_posture/server/tasks/task_state.test.ts) | describe |  |  |
| [should work on empty object when running the up migration](x-pack/plugins/cloud_security_posture/server/tasks/task_state.test.ts) | it |  |  |
| [shouldn](x-pack/plugins/cloud_security_posture/server/tasks/task_state.test.ts) | it |  |  |
| [should drop unknown properties when running the up migration](x-pack/plugins/cloud_security_posture/server/tasks/task_state.test.ts) | it |  |  |
</details>

## Directory: x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture

**Total Tests:** 43 | **Skipped:** 6 (13.95%) | **Todo:** 0 (0.00%)

![](https://img.shields.io/badge/FTR-blue) ![](https://img.shields.io/badge/SERVERLESS-pink) ![](https://img.shields.io/badge/API-INTEGRATION-purple) ![](https://img.shields.io/badge/HAS-SKIP-yellow)

<details>
<summary>Test Details</summary>

| Test Label | Type | Skipped | Todo |
|------------|------|---------|------|
| [GET /internal/cloud_security_posture/benchmark](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/benchmark/v1.ts) | describe |  |  |
| [Should return non-empty array filled with Rules if user has CSP integrations](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/benchmark/v1.ts) | it |  |  |
| [Should return array size 2 when we set per page to be only 2 (total element is still 3)](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/benchmark/v1.ts) | it |  |  |
| [Should return array size 2 when we set per page to be only 2 (total element is still 3)](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/benchmark/v1.ts) | it |  |  |
| [Should return empty array when we set page to be above the last page number](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/benchmark/v1.ts) | it |  |  |
| [GET /internal/cloud_security_posture/benchmark](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/benchmark/v2.ts) | describe |  |  |
| [Should return all benchmarks if user has CSP integrations](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/benchmark/v2.ts) | it |  |  |
| [GET internal/cloud_security_posture/rules/_find](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/find_csp_benchmark_rule.ts) | describe |  |  |
| [Should return 500 error code when not provide package policy id or benchmark id](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/find_csp_benchmark_rule.ts) | it |  |  |
| [Should return 500 error code when provide both package policy id and benchmark id](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/find_csp_benchmark_rule.ts) | it |  |  |
| [Should return 404 status code when the package policy ID does not exist](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/find_csp_benchmark_rule.ts) | it |  |  |
| [Should return 200 status code and filter rules by benchmarkId](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/find_csp_benchmark_rule.ts) | it |  |  |
| [Should return 200 status code, and only requested fields in the response](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/find_csp_benchmark_rule.ts) | it |  |  |
| [Should return 200 status code, items sorted by metadata.section field](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/find_csp_benchmark_rule.ts) | it |  |  |
| [Should return 200 status code and paginate rules with a limit of PerPage](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/find_csp_benchmark_rule.ts) | it |  |  |
| [cloud_security_posture](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/index.ts) | describe |  |  |
| [Intercept the usage API request sent by the metering background task manager](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/serverless_metering/cloud_security_metering.ts) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Should intercept usage API request for CSPM](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/serverless_metering/cloud_security_metering.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Should intercept usage API request for KSPM](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/serverless_metering/cloud_security_metering.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Should intercept usage API request for CNVM](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/serverless_metering/cloud_security_metering.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Should intercept usage API request for Defend for Containers](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/serverless_metering/cloud_security_metering.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Should intercept usage API request with all integrations usage records](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/serverless_metering/cloud_security_metering.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [GET /internal/cloud_security_posture/status](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/status/status_indexed.ts) | describe |  |  |
| [STATUS = INDEXED TEST](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/status/status_indexed.ts) | describe |  |  |
| [Return kspm status indexed when logs-cloud_security_posture.findings_latest-default contains new kspm documents](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/status/status_indexed.ts) | it |  |  |
| [Return cspm status indexed when logs-cloud_security_posture.findings_latest-default contains new cspm documents](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/status/status_indexed.ts) | it |  |  |
| [Return vuln status indexed when logs-cloud_security_posture.vulnerabilities_latest-default contains new documents](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/status/status_indexed.ts) | it |  |  |
| [GET /internal/cloud_security_posture/status](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/status/status_indexing.ts) | describe |  |  |
| [STATUS = INDEXING TEST](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/status/status_indexing.ts) | describe |  |  |
| [Return kspm status indexing when logs-cloud_security_posture.findings_latest-default doesn](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/status/status_indexing.ts) | it |  |  |
| [Return cspm status indexing when logs-cloud_security_posture.findings_latest-default doesn](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/status/status_indexing.ts) | it |  |  |
| [Return vuln status indexing when logs-cloud_security_posture.vulnerabilities_latest-default doesn](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/status/status_indexing.ts) | it |  |  |
| [GET /internal/cloud_security_posture/status](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/status/status_not_deployed_not_installed.ts) | describe |  |  |
| [STATUS = NOT-DEPLOYED and STATUS = NOT-INSTALLED TEST](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/status/status_not_deployed_not_installed.ts) | describe |  |  |
| [Should return not-deployed when installed kspm, no findings on either indices and no healthy agents](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/status/status_not_deployed_not_installed.ts) | it |  |  |
| [Should return not-deployed when installed cspm, no findings on either indices and no healthy agents](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/status/status_not_deployed_not_installed.ts) | it |  |  |
| [Should return not-deployed when installed cnvm, no findings on either indices and no healthy agents](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/status/status_not_deployed_not_installed.ts) | it |  |  |
| [Verify cloud_security_posture telemetry payloads](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/telemetry.ts) | describe |  |  |
| [includes only KSPM findings](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/telemetry.ts) | it |  |  |
| [includes only CSPM findings](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/telemetry.ts) | it |  |  |
| [includes CSPM and KSPM findings](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/telemetry.ts) | it |  |  |
| [](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/telemetry.ts) | it |  |  |
| [includes KSPM findings without posture_type and CSPM findings as well](x-pack/test_serverless/api_integration/test_suites/security/cloud_security_posture/telemetry.ts) | it |  |  |
</details>

## Directory: x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture

**Total Tests:** 33 | **Skipped:** 3 (9.09%) | **Todo:** 0 (0.00%)

![](https://img.shields.io/badge/FTR-blue) ![](https://img.shields.io/badge/SERVERLESS-pink) ![](https://img.shields.io/badge/HAS-SKIP-yellow)

<details>
<summary>Test Details</summary>

| Test Label | Type | Skipped | Todo |
|------------|------|---------|------|
| [Agentless API Serverless](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless_api/create_agent.ts) | describe |  |  |
| [should create agentless-agent](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless_api/create_agent.ts) | it |  |  |
| [should create default agent-based agent](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless_api/create_agent.ts) | it |  |  |
| [cloud_security_posture](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless_api/index.ts) | describe |  |  |
| [Serverless - Agentless CIS Integration Page](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_aws.ts) | describe |  |  |
| [Serverless - Agentless CIS_AWS Single Account Launch Cloud formation](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_aws.ts) | describe |  |  |
| [should show CIS_AWS Launch Cloud formation button when credentials selector is direct access keys and package version is ${CLOUD_CREDENTIALS_PACKAGE_VERSION}](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_aws.ts) | it |  |  |
| [should hide CIS_AWS Launch Cloud formation button when credentials selector is temporary keys and package version is less than ${previousPackageVersion}](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_aws.ts) | it |  |  |
| [Serverless - Agentless CIS_AWS ORG Account Launch Cloud formation](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_aws.ts) | describe |  |  |
| [should show CIS_AWS Launch Cloud formation button when credentials selector is direct access keys and package version is ${CLOUD_CREDENTIALS_PACKAGE_VERSION}](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_aws.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [should hide CIS_AWS Launch Cloud formation button when credentials selector is temporary keys and package version is less than ${previousPackageVersion}](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_aws.ts) | it |  |  |
| [Serverless - Agentless CIS_AWS edit flow](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_aws.ts) | describe |  |  |
| [user should save and edit agentless integration policy](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_aws.ts) | it |  |  |
| [Serverless - Agentless CIS_AWS Create flow](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_aws.ts) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [user should save agentless integration policy when there are no api or validation errors and button is not disabled](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_aws.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Agentless CIS Integration Page](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_gcp.ts) | describe |  |  |
| [Agentless CIS_GCP Single Account Launch Cloud shell](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_gcp.ts) | describe |  |  |
| [should show CIS_GCP Launch Cloud Shell button when package version is ${CLOUD_CREDENTIALS_PACKAGE_VERSION}](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_gcp.ts) | it |  |  |
| [should hide CIS_GCP Launch Cloud Shell button when package version is less than ${CLOUD_CREDENTIALS_PACKAGE_VERSION}](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_gcp.ts) | it |  |  |
| [Agentless CIS_GCP ORG Account Launch Cloud Shell](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_gcp.ts) | describe |  |  |
| [should show CIS_GCP Launch Cloud Shell button when package version is ${CLOUD_CREDENTIALS_PACKAGE_VERSION}](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_gcp.ts) | it |  |  |
| [should hide CIS_GCP Launch Cloud shell button when package version is ${previousPackageVersion}](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_gcp.ts) | it |  |  |
| [Serverless - Agentless CIS_GCP edit flow](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_gcp.ts) | describe |  |  |
| [user should save and edit agentless integration policy](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/cis_integration_gcp.ts) | it |  |  |
| [cloud_security_posture](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/agentless/index.ts) | describe |  |  |
| [Cloud Posture Dashboard Page](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/compliance_dashboard.ts) | describe |  |  |
| [Kubernetes Dashboard](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/compliance_dashboard.ts) | describe |  |  |
| [displays accurate summary compliance score](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/compliance_dashboard.ts) | it |  |  |
| [[Essentials PLI] Test Cloud Security Posture Integrations on Serverless](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/csp_integrations_form.essentials.ts) | describe |  |  |
| [[Essentials PLI] Integration installation form should be available with Essentials or Complete PLI](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/csp_integrations_form.essentials.ts) | it |  |  |
| [Test Cloud Security Posture Integrations on Serverless](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/csp_integrations_form.ts) | describe |  |  |
| [Integration installation form should not be available without required PLI](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/csp_integrations_form.ts) | it |  |  |
| [cloud_security_posture](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/index.ts) | describe |  |  |
</details>

## Directory: x-pack/test/api_integration/apis/cloud_security_posture

**Total Tests:** 65 | **Skipped:** 0 (0.00%) | **Todo:** 0 (0.00%)

![](https://img.shields.io/badge/FTR-blue) ![](https://img.shields.io/badge/API-INTEGRATION-purple)

<details>
<summary>Test Details</summary>

| Test Label | Type | Skipped | Todo |
|------------|------|---------|------|
| [GET /internal/cloud_security_posture/benchmark](x-pack/test/api_integration/apis/cloud_security_posture/benchmark/v1.ts) | describe |  |  |
| [Should return non-empty array filled with Rules if user has CSP integrations](x-pack/test/api_integration/apis/cloud_security_posture/benchmark/v1.ts) | it |  |  |
| [Should return array size 2 when we set per page to be only 2 (total element is still 3)](x-pack/test/api_integration/apis/cloud_security_posture/benchmark/v1.ts) | it |  |  |
| [Should return array size 2 when we set per page to be only 2 (total element is still 3)](x-pack/test/api_integration/apis/cloud_security_posture/benchmark/v1.ts) | it |  |  |
| [Should return empty array when we set page to be above the last page number](x-pack/test/api_integration/apis/cloud_security_posture/benchmark/v1.ts) | it |  |  |
| [GET /internal/cloud_security_posture/benchmark](x-pack/test/api_integration/apis/cloud_security_posture/benchmark/v2.ts) | describe |  |  |
| [Should return all benchmarks if user has CSP integrations](x-pack/test/api_integration/apis/cloud_security_posture/benchmark/v2.ts) | it |  |  |
| [GET internal/cloud_security_posture/rules/_find](x-pack/test/api_integration/apis/cloud_security_posture/find_csp_benchmark_rule.ts) | describe |  |  |
| [Should return 500 error code when not provide package policy id or benchmark id](x-pack/test/api_integration/apis/cloud_security_posture/find_csp_benchmark_rule.ts) | it |  |  |
| [Should return 500 error code when provide both package policy id and benchmark id](x-pack/test/api_integration/apis/cloud_security_posture/find_csp_benchmark_rule.ts) | it |  |  |
| [Should return 404 status code when the package policy ID does not exist](x-pack/test/api_integration/apis/cloud_security_posture/find_csp_benchmark_rule.ts) | it |  |  |
| [Should return 200 status code and filter rules by benchmarkId](x-pack/test/api_integration/apis/cloud_security_posture/find_csp_benchmark_rule.ts) | it |  |  |
| [Should return 200 status code, and only requested fields in the response](x-pack/test/api_integration/apis/cloud_security_posture/find_csp_benchmark_rule.ts) | it |  |  |
| [Should return 200 status code, items sorted by metadata.section field](x-pack/test/api_integration/apis/cloud_security_posture/find_csp_benchmark_rule.ts) | it |  |  |
| [Should return 200 status code and paginate rules with a limit of PerPage](x-pack/test/api_integration/apis/cloud_security_posture/find_csp_benchmark_rule.ts) | it |  |  |
| [cloud_security_posture](x-pack/test/api_integration/apis/cloud_security_posture/index.ts) | describe |  |  |
| [GET internal/cloud_security_posture/rules/_find](x-pack/test/api_integration/apis/cloud_security_posture/rules/v1.ts) | describe |  |  |
| [Should return 500 error code when not provide package policy id or benchmark id](x-pack/test/api_integration/apis/cloud_security_posture/rules/v1.ts) | it |  |  |
| [Should return 500 error code when provide both package policy id and benchmark id](x-pack/test/api_integration/apis/cloud_security_posture/rules/v1.ts) | it |  |  |
| [Should return 404 status code when the package policy ID does not exist](x-pack/test/api_integration/apis/cloud_security_posture/rules/v1.ts) | it |  |  |
| [Should return 200 status code and filter rules by benchmarkId](x-pack/test/api_integration/apis/cloud_security_posture/rules/v1.ts) | it |  |  |
| [Should return 200 status code, and only requested fields in the response](x-pack/test/api_integration/apis/cloud_security_posture/rules/v1.ts) | it |  |  |
| [Should return 200 status code, items sorted by metadata.section field](x-pack/test/api_integration/apis/cloud_security_posture/rules/v1.ts) | it |  |  |
| [Should return 200 status code and paginate rules with a limit of PerPage](x-pack/test/api_integration/apis/cloud_security_posture/rules/v1.ts) | it |  |  |
| [GET internal/cloud_security_posture/rules/_find](x-pack/test/api_integration/apis/cloud_security_posture/rules/v2.ts) | describe |  |  |
| [Should return 500 error code when not provide benchmark id](x-pack/test/api_integration/apis/cloud_security_posture/rules/v2.ts) | it |  |  |
| [Should return 200 status code and filter rules by benchmarkId and benchmarkVersion](x-pack/test/api_integration/apis/cloud_security_posture/rules/v2.ts) | it |  |  |
| [Should return 200 status code, and only requested fields in the response](x-pack/test/api_integration/apis/cloud_security_posture/rules/v2.ts) | it |  |  |
| [Should return 200 status code, items sorted by metadata.section field](x-pack/test/api_integration/apis/cloud_security_posture/rules/v2.ts) | it |  |  |
| [Should return 200 status code and paginate rules with a limit of PerPage](x-pack/test/api_integration/apis/cloud_security_posture/rules/v2.ts) | it |  |  |
| [GET /internal/cloud_security_posture/status](x-pack/test/api_integration/apis/cloud_security_posture/status/status_index_timeout.ts) | describe |  |  |
| [STATUS = INDEX_TIMEOUT TEST](x-pack/test/api_integration/apis/cloud_security_posture/status/status_index_timeout.ts) | describe |  |  |
| [Should return index-timeout when installed kspm, has findings only on logs-cloud_security_posture.findings-default* and it has been more than 10 minutes since the installation](x-pack/test/api_integration/apis/cloud_security_posture/status/status_index_timeout.ts) | it |  |  |
| [Should return index-timeout when installed cspm, has findings only on logs-cloud_security_posture.findings-default* and it has been more than 10 minutes since the installation](x-pack/test/api_integration/apis/cloud_security_posture/status/status_index_timeout.ts) | it |  |  |
| [Should return index-timeout when installed cnvm, has findings only on logs-cloud_security_posture.vulnerabilities-default* and it has been more than 4 hours minutes since the installation](x-pack/test/api_integration/apis/cloud_security_posture/status/status_index_timeout.ts) | it |  |  |
| [GET /internal/cloud_security_posture/status](x-pack/test/api_integration/apis/cloud_security_posture/status/status_indexed.ts) | describe |  |  |
| [STATUS = INDEXED TEST](x-pack/test/api_integration/apis/cloud_security_posture/status/status_indexed.ts) | describe |  |  |
| [Return hasMisconfigurationsFindings true when there are latest findings but no installed integrations](x-pack/test/api_integration/apis/cloud_security_posture/status/status_indexed.ts) | it |  |  |
| [Return hasMisconfigurationsFindings true when there are only findings in third party index](x-pack/test/api_integration/apis/cloud_security_posture/status/status_indexed.ts) | it |  |  |
| [Return hasMisconfigurationsFindings false when there are no findings](x-pack/test/api_integration/apis/cloud_security_posture/status/status_indexed.ts) | it |  |  |
| [Return kspm status indexed when logs-cloud_security_posture.findings_latest-default contains new kspm documents](x-pack/test/api_integration/apis/cloud_security_posture/status/status_indexed.ts) | it |  |  |
| [Return cspm status indexed when logs-cloud_security_posture.findings_latest-default contains new cspm documents](x-pack/test/api_integration/apis/cloud_security_posture/status/status_indexed.ts) | it |  |  |
| [Return vuln status indexed when logs-cloud_security_posture.vulnerabilities_latest-default contains new documents](x-pack/test/api_integration/apis/cloud_security_posture/status/status_indexed.ts) | it |  |  |
| [GET /internal/cloud_security_posture/status](x-pack/test/api_integration/apis/cloud_security_posture/status/status_indexing.ts) | describe |  |  |
| [STATUS = INDEXING TEST](x-pack/test/api_integration/apis/cloud_security_posture/status/status_indexing.ts) | describe |  |  |
| [Return kspm status indexing when logs-cloud_security_posture.findings_latest-default doesn](x-pack/test/api_integration/apis/cloud_security_posture/status/status_indexing.ts) | it |  |  |
| [Return cspm status indexing when logs-cloud_security_posture.findings_latest-default doesn](x-pack/test/api_integration/apis/cloud_security_posture/status/status_indexing.ts) | it |  |  |
| [Return vuln status indexing when logs-cloud_security_posture.vulnerabilities_latest-default doesn](x-pack/test/api_integration/apis/cloud_security_posture/status/status_indexing.ts) | it |  |  |
| [GET /internal/cloud_security_posture/status](x-pack/test/api_integration/apis/cloud_security_posture/status/status_not_deployed_not_installed.ts) | describe |  |  |
| [STATUS = NOT-DEPLOYED and STATUS = NOT-INSTALLED TEST](x-pack/test/api_integration/apis/cloud_security_posture/status/status_not_deployed_not_installed.ts) | describe |  |  |
| [Should return not-deployed when installed kspm, no findings on either indices and no healthy agents](x-pack/test/api_integration/apis/cloud_security_posture/status/status_not_deployed_not_installed.ts) | it |  |  |
| [Should return not-deployed when installed cspm, no findings on either indices and no healthy agents](x-pack/test/api_integration/apis/cloud_security_posture/status/status_not_deployed_not_installed.ts) | it |  |  |
| [Should return not-deployed when installed cnvm, no findings on either indices and no healthy agents](x-pack/test/api_integration/apis/cloud_security_posture/status/status_not_deployed_not_installed.ts) | it |  |  |
| [GET /internal/cloud_security_posture/status](x-pack/test/api_integration/apis/cloud_security_posture/status/status_unprivileged.ts) | describe |  |  |
| [STATUS = UNPRIVILEGED TEST](x-pack/test/api_integration/apis/cloud_security_posture/status/status_unprivileged.ts) | describe |  |  |
| [Return unprivileged for cspm, kspm, vuln_mgmt when users don](x-pack/test/api_integration/apis/cloud_security_posture/status/status_unprivileged.ts) | it |  |  |
| [status = unprivileged test indices](x-pack/test/api_integration/apis/cloud_security_posture/status/status_unprivileged.ts) | describe |  |  |
| [Return unprivileged when missing access to findings_latest index](x-pack/test/api_integration/apis/cloud_security_posture/status/status_unprivileged.ts) | it |  |  |
| [Return unprivileged when missing access to score index](x-pack/test/api_integration/apis/cloud_security_posture/status/status_unprivileged.ts) | it |  |  |
| [Return unprivileged when missing access to vulnerabilities_latest index](x-pack/test/api_integration/apis/cloud_security_posture/status/status_unprivileged.ts) | it |  |  |
| [GET /internal/cloud_security_posture/status](x-pack/test/api_integration/apis/cloud_security_posture/status/status_waiting_for_results.ts) | describe |  |  |
| [STATUS = WAITING_FOR_RESULT TEST](x-pack/test/api_integration/apis/cloud_security_posture/status/status_waiting_for_results.ts) | describe |  |  |
| [Should return waiting_for_result when installed kspm, has no findings and it has been less than 10 minutes since the installation](x-pack/test/api_integration/apis/cloud_security_posture/status/status_waiting_for_results.ts) | it |  |  |
| [Should return waiting_for_result when installed cspm, has no findings and it has been less than 10 minutes since the installation](x-pack/test/api_integration/apis/cloud_security_posture/status/status_waiting_for_results.ts) | it |  |  |
| [Should return waiting_for_result when installed cnvm, has no findings and it has been less than 4 hours minutes since the installation](x-pack/test/api_integration/apis/cloud_security_posture/status/status_waiting_for_results.ts) | it |  |  |
</details>

## Directory: x-pack/test/cloud_security_posture_api

**Total Tests:** 58 | **Skipped:** 2 (3.45%) | **Todo:** 0 (0.00%)

![](https://img.shields.io/badge/FTR-blue) ![](https://img.shields.io/badge/API-INTEGRATION-purple) ![](https://img.shields.io/badge/HAS-SKIP-yellow)

<details>
<summary>Test Details</summary>

| Test Label | Type | Skipped | Todo |
|------------|------|---------|------|
| [GET /internal/cloud_security_posture/benchmarks](x-pack/test/cloud_security_posture_api/routes/benchmarks.ts) | describe |  |  |
| [Get Benchmark API](x-pack/test/cloud_security_posture_api/routes/benchmarks.ts) | describe |  |  |
| [Verify cspm benchmark score is updated when muting rules](x-pack/test/cloud_security_posture_api/routes/benchmarks.ts) | it |  |  |
| [Verify kspm benchmark score is updated when muting rules](x-pack/test/cloud_security_posture_api/routes/benchmarks.ts) | it |  |  |
| [Get Benchmark API](x-pack/test/cloud_security_posture_api/routes/benchmarks.ts) | describe |  |  |
| [Calling Benchmark API as User with no read access to Security](x-pack/test/cloud_security_posture_api/routes/benchmarks.ts) | it |  |  |
| [Calling Benchmark API as User with read access to Security](x-pack/test/cloud_security_posture_api/routes/benchmarks.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Verify update csp rules states API](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_bulk_update.ts) | describe |  |  |
| [mute benchmark rules successfully](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_bulk_update.ts) | it |  |  |
| [unmute rules successfully](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_bulk_update.ts) | it |  |  |
| [verify new rules are added and existing rules are set.](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_bulk_update.ts) | it |  |  |
| [mute detection rule successfully](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_bulk_update.ts) | it |  |  |
| [Expect to mute two benchmark rules and one detection rule](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_bulk_update.ts) | it |  |  |
| [Expect to save rules states when requesting to update empty object](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_bulk_update.ts) | it |  |  |
| [set wrong action input](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_bulk_update.ts) | it |  |  |
| [users without read privileges on cloud security should not be able to mute](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_bulk_update.ts) | it |  |  |
| [users with all privileges on cloud security should be able to mute](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_bulk_update.ts) | it |  |  |
| [Tests get rules states API](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_get_states.ts) | describe |  |  |
| [get rules states successfully](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_get_states.ts) | it |  |  |
| [get empty object when rules states not exists](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_get_states.ts) | it |  |  |
| [GET rules states API with user with read access](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_get_states.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [GET rules states API API with user without read access](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_get_states.ts) | it |  |  |
| [/internal/cloud_security_posture/detection_engine_rules/alerts/_status](x-pack/test/cloud_security_posture_api/routes/get_detection_engine_alerts_count_by_rule_tags.ts) | describe |  |  |
| [GET detection_engine_rules API with user that has specific access](x-pack/test/cloud_security_posture_api/routes/get_detection_engine_alerts_count_by_rule_tags.ts) | describe |  |  |
| [GET detection_engine_rules API with user with read access](x-pack/test/cloud_security_posture_api/routes/get_detection_engine_alerts_count_by_rule_tags.ts) | it |  |  |
| [GET detection_engine_rules API with user without read access](x-pack/test/cloud_security_posture_api/routes/get_detection_engine_alerts_count_by_rule_tags.ts) | it |  |  |
| [Cloud Security Posture](x-pack/test/cloud_security_posture_api/routes/index.ts) | describe |  |  |
| [GET /internal/cloud_security_posture/stats](x-pack/test/cloud_security_posture_api/routes/stats.ts) | describe |  |  |
| [CSPM Compliance Dashboard Stats API](x-pack/test/cloud_security_posture_api/routes/stats.ts) | describe |  |  |
| [should return CSPM cluster V1 ](x-pack/test/cloud_security_posture_api/routes/stats.ts) | it |  |  |
| [should return CSPM benchmarks V2 ](x-pack/test/cloud_security_posture_api/routes/stats.ts) | it |  |  |
| [KSPM Compliance Dashboard Stats API](x-pack/test/cloud_security_posture_api/routes/stats.ts) | describe |  |  |
| [should return KSPM clusters V1 ](x-pack/test/cloud_security_posture_api/routes/stats.ts) | it |  |  |
| [should return KSPM benchmarks V2](x-pack/test/cloud_security_posture_api/routes/stats.ts) | it |  |  |
| [should return KSPM benchmarks V2](x-pack/test/cloud_security_posture_api/routes/stats.ts) | it |  |  |
| [Compliance dashboard based on enabled rules](x-pack/test/cloud_security_posture_api/routes/stats.ts) | describe |  |  |
| [should calculate cspm benchmarks posture score based only on enabled rules](x-pack/test/cloud_security_posture_api/routes/stats.ts) | it |  |  |
| [should calculate kspm benchmarks posture score based only on enabled rules](x-pack/test/cloud_security_posture_api/routes/stats.ts) | it |  |  |
| [GET stats API with user that has specific access](x-pack/test/cloud_security_posture_api/routes/stats.ts) | describe |  |  |
| [GET stats API V1 with user with read access](x-pack/test/cloud_security_posture_api/routes/stats.ts) | it |  |  |
| [GET stats API V1 with user with read access](x-pack/test/cloud_security_posture_api/routes/stats.ts) | it |  |  |
| [GET stats API V2 with user with read access](x-pack/test/cloud_security_posture_api/routes/stats.ts) | it |  |  |
| [GET stats API V2 with user without read access](x-pack/test/cloud_security_posture_api/routes/stats.ts) | it |  |  |
| [GET /internal/cloud_security_posture/status](x-pack/test/cloud_security_posture_api/routes/status.ts) | describe |  |  |
| [GET status API with user that has specific access](x-pack/test/cloud_security_posture_api/routes/status.ts) | describe |  |  |
| [GET stats API with user with read access](x-pack/test/cloud_security_posture_api/routes/status.ts) | it |  |  |
| [GET status API with user without read access](x-pack/test/cloud_security_posture_api/routes/status.ts) | it |  |  |
| [Vulnerability Dashboard API](x-pack/test/cloud_security_posture_api/routes/vulnerabilities_dashboard.ts) | describe |  |  |
| [responds with a 200 status code and matching data mock](x-pack/test/cloud_security_posture_api/routes/vulnerabilities_dashboard.ts) | it |  |  |
| [returns a 400 error when necessary indices are nonexistent](x-pack/test/cloud_security_posture_api/routes/vulnerabilities_dashboard.ts) | it |  |  |
| [GET vulnerabilities dashboard API with users with read access to cloud security posture](x-pack/test/cloud_security_posture_api/routes/vulnerabilities_dashboard.ts) | it |  |  |
| [GET vulnerabilities dashboard API with users without read access to cloud security posture](x-pack/test/cloud_security_posture_api/routes/vulnerabilities_dashboard.ts) | it |  |  |
| [Verify cloud_security_posture telemetry payloads](x-pack/test/cloud_security_posture_api/telemetry/telemetry.ts) | describe |  |  |
| [includes only KSPM findings](x-pack/test/cloud_security_posture_api/telemetry/telemetry.ts) | it |  |  |
| [includes only CSPM findings](x-pack/test/cloud_security_posture_api/telemetry/telemetry.ts) | it |  |  |
| [includes CSPM and KSPM findings](x-pack/test/cloud_security_posture_api/telemetry/telemetry.ts) | it |  |  |
| [](x-pack/test/cloud_security_posture_api/telemetry/telemetry.ts) | it |  |  |
| [includes KSPM findings without posture_type and CSPM findings as well](x-pack/test/cloud_security_posture_api/telemetry/telemetry.ts) | it |  |  |
</details>

## Directory: x-pack/test/cloud_security_posture_functional

**Total Tests:** 223 | **Skipped:** 69 (30.94%) | **Todo:** 3 (1.35%)

![](https://img.shields.io/badge/FTR-blue) ![](https://img.shields.io/badge/HAS-SKIP-yellow) ![](https://img.shields.io/badge/HAS-TODO-green)

<details>
<summary>Test Details</summary>

| Test Label | Type | Skipped | Todo |
|------------|------|---------|------|
| [Agentless cloud](x-pack/test/cloud_security_posture_functional/agentless/create_agent.ts) | describe |  |  |
| [should create agentless-agent](x-pack/test/cloud_security_posture_functional/agentless/create_agent.ts) | it |  |  |
| [should create default agent-based agent](x-pack/test/cloud_security_posture_functional/agentless/create_agent.ts) | it |  |  |
| [Benchmark Page - Sanity Tests](x-pack/test/cloud_security_posture_functional/cloud_tests/benchmark_sanity.ts) | describe |  |  |
| [Benchmark table exists](x-pack/test/cloud_security_posture_functional/cloud_tests/benchmark_sanity.ts) | it |  |  |
| [Benchmarks count is more than 0](x-pack/test/cloud_security_posture_functional/cloud_tests/benchmark_sanity.ts) | it |  |  |
| [For each benchmark, evaluation and complience are not empty](x-pack/test/cloud_security_posture_functional/cloud_tests/benchmark_sanity.ts) | it |  |  |
| [Cloud Posture Dashboard Page - Sanity Tests](x-pack/test/cloud_security_posture_functional/cloud_tests/dashboard_sanity.ts) | describe |  |  |
| [Cloud Dashboard](x-pack/test/cloud_security_posture_functional/cloud_tests/dashboard_sanity.ts) | describe |  |  |
| [displays compliance score greater than 40](x-pack/test/cloud_security_posture_functional/cloud_tests/dashboard_sanity.ts) | it |  |  |
| [displays all compliance scores](x-pack/test/cloud_security_posture_functional/cloud_tests/dashboard_sanity.ts) | it |  |  |
| [displays a number of resources evaluated greater than 1500](x-pack/test/cloud_security_posture_functional/cloud_tests/dashboard_sanity.ts) | it |  |  |
| [Compliance By CIS sections have non empty values](x-pack/test/cloud_security_posture_functional/cloud_tests/dashboard_sanity.ts) | it |  |  |
| [Navigation to Findings page](x-pack/test/cloud_security_posture_functional/cloud_tests/dashboard_sanity.ts) | it |  |  |
| [Kubernetes Dashboard](x-pack/test/cloud_security_posture_functional/cloud_tests/dashboard_sanity.ts) | describe |  |  |
| [displays compliance score greater than 80](x-pack/test/cloud_security_posture_functional/cloud_tests/dashboard_sanity.ts) | it |  |  |
| [displays a number of resources evaluated greater than 150](x-pack/test/cloud_security_posture_functional/cloud_tests/dashboard_sanity.ts) | it |  |  |
| [Compliance By CIS sections have non empty values](x-pack/test/cloud_security_posture_functional/cloud_tests/dashboard_sanity.ts) | it |  |  |
| [Navigation to Findings page](x-pack/test/cloud_security_posture_functional/cloud_tests/dashboard_sanity.ts) | it |  |  |
| [Findings Page - Sanity Tests](x-pack/test/cloud_security_posture_functional/cloud_tests/findings_sanity.ts) | describe |  |  |
| [Findings - Querying data](x-pack/test/cloud_security_posture_functional/cloud_tests/findings_sanity.ts) | describe |  |  |
| [Querying ${provider} provider data](x-pack/test/cloud_security_posture_functional/cloud_tests/findings_sanity.ts) | it |  |  |
| [Paginating and sorting data](x-pack/test/cloud_security_posture_functional/cloud_tests/findings_sanity.ts) | it |  |  |
| [Cloud Security Posture](x-pack/test/cloud_security_posture_functional/cloud_tests/index.ts) | describe |  |  |
| [Data Views](x-pack/test/cloud_security_posture_functional/data_views/data_views.ts) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Verify data view is created once user reach the findings page - default space](x-pack/test/cloud_security_posture_functional/data_views/data_views.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Verify data view is created once user reach the dashboard page - default space](x-pack/test/cloud_security_posture_functional/data_views/data_views.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Verify data view is created once user reach the findings page -  non default space](x-pack/test/cloud_security_posture_functional/data_views/data_views.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Verify data view is created once user reach the dashboard page -  non default space](x-pack/test/cloud_security_posture_functional/data_views/data_views.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Verify data view is created once user with read permissions reach the dashboard page](x-pack/test/cloud_security_posture_functional/data_views/data_views.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Cloud Security Posture](x-pack/test/cloud_security_posture_functional/data_views/index.ts) | describe |  |  |
| [Access with custom roles](x-pack/test/cloud_security_posture_functional/pages/benchmark.ts) | describe |  |  |
| [Access with valid user role](x-pack/test/cloud_security_posture_functional/pages/benchmark.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Access with invalid user role](x-pack/test/cloud_security_posture_functional/pages/benchmark.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Access with custom roles - rule page](x-pack/test/cloud_security_posture_functional/pages/benchmark.ts) | describe |  |  |
| [Access with valid user role](x-pack/test/cloud_security_posture_functional/pages/benchmark.ts) | it |  |  |
| [Access with invalid user role](x-pack/test/cloud_security_posture_functional/pages/benchmark.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Test adding Cloud Security Posture Integrations CNVM](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cnvm/cis_integration_cnvm.ts) | describe |  |  |
| [CNVM AWS](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cnvm/cis_integration_cnvm.ts) | describe |  |  |
| [Hyperlink on PostInstallation Modal should have the correct URL](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cnvm/cis_integration_cnvm.ts) | it |  |  |
| [On Add Agent modal there should be modal that has Cloud Formation details as well as button that redirects user to Cloud formation page on AWS upon clicking them ](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cnvm/cis_integration_cnvm.ts) | it |  |  |
| [Clicking on Launch CloudFormation on post intall modal should lead user to Cloud Formation page](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cnvm/cis_integration_cnvm.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Test adding Cloud Security Posture Integrations CSPM AWS](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | describe |  |  |
| [CIS_AWS Organization Cloud Formation](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | describe |  |  |
| [Initial form state, AWS Org account, and CloudFormation should be selected by default](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | it |  |  |
| [Hyperlink on PostInstallation Modal should have the correct URL](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | it |  |  |
| [On Add Agent modal there should be modal that has Cloud Formation details as well as button that redirects user to Cloud formation page on AWS upon clicking them ](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | it |  |  |
| [Clicking on Launch CloudFormation on post intall modal should lead user to Cloud Formation page](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | it |  |  |
| [CIS_AWS Organization Manual Assume Role](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [CIS_AWS Organization Manual Assume Role Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [CIS_AWS Organization Manual Direct Access](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | describe |  |  |
| [CIS_AWS Organization Manual Direct Access Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | it |  |  |
| [CIS_AWS Organization Manual Temporary Keys](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | describe |  |  |
| [CIS_AWS Organization Manual Temporary Keys Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | it |  |  |
| [CIS_AWS Organization Manual Shared Access](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | describe |  |  |
| [CIS_AWS Organization Manual Shared Access Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | it |  |  |
| [CIS_AWS Single Cloud Formation](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | describe |  |  |
| [CIS_AWS Single Cloud Formation workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | it |  |  |
| [CIS_AWS Single Manual Assume Role](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | describe |  |  |
| [CIS_AWS Single Manual Assume Role Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | it |  |  |
| [CIS_AWS Single Manual Direct Access](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | describe |  |  |
| [CIS_AWS Single Manual Direct Access Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | it |  |  |
| [CIS_AWS Single Manual Temporary Keys](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | describe |  |  |
| [CIS_AWS Single Manual Temporary Keys Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | it |  |  |
| [CIS_AWS Single Manual Shared Access](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | describe |  |  |
| [CIS_AWS Single Manual Shared Access Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_aws.ts) | it |  |  |
| [Test adding Cloud Security Posture Integrations CSPM AZURE](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_azure.ts) | describe |  |  |
| [Azure Organization ARM Template](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_azure.ts) | describe |  |  |
| [Azure Organization ARM Template Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_azure.ts) | it |  |  |
| [Azure Organization Manual Managed Identity](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_azure.ts) | describe |  |  |
| [Azure Organization Manual Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_azure.ts) | it |  |  |
| [Azure Organization Manual Service Principle with Client Secret](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_azure.ts) | describe |  |  |
| [Azure Organization Manual Service Principle with Client Secret Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_azure.ts) | it |  |  |
| [Azure Organization Manual Service Principle with Client Certificate](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_azure.ts) | describe |  |  |
| [Azure Organization Manual Service Principle with Client Certificate Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_azure.ts) | it |  |  |
| [Azure Single ARM Template](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_azure.ts) | describe |  |  |
| [Azure Single ARM Template Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_azure.ts) | it |  |  |
| [Azure Single Manual Managed Identity](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_azure.ts) | describe |  |  |
| [Azure Single Manual Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_azure.ts) | it |  |  |
| [Azure Single Manual Service Principle with Client Secret](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_azure.ts) | describe |  |  |
| [Azure Single Manual Service Principle with Client Secret Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_azure.ts) | it |  |  |
| [Azure Single Manual Service Principle with Client Certificate](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_azure.ts) | describe |  |  |
| [Azure Single Manual Service Principle with Client Certificate Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_azure.ts) | it |  |  |
| [Test adding Cloud Security Posture Integrations CSPM GCP](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | describe |  |  |
| [CIS_GCP Organization](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Switch between Manual and Google cloud shell](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are no Project ID or Organization ID provided, it should use default value](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are Project ID or Organization ID provided, it should use that value](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Add Agent FLyout - Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are Project ID or Organization ID provided, it should use that value](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Organization ID field on cloud shell command should only be shown if user chose Google Cloud Shell, if user chose Single Account it shouldn not show up](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Hyperlink on PostInstallation Modal should have the correct URL](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Clicking on Launch CloudShell on post intall modal should lead user to CloudShell page](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [CIS_GCP Organization Credentials File](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [CIS_GCP Organization Credentials File workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [CIS_GCP Organization Credentials JSON](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | describe |  |  |
| [CIS_GCP Organization Credentials JSON workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | it |  |  |
| [CIS_GCP Single](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are no Project ID, it should use default value](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are Project ID, it should use that value](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Add Agent FLyout - Organization ID field on cloud shell command should only be shown if user chose Google Cloud Shell, if user chose Single Account it shouldn not show up](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [On add agent modal, if user chose Google Cloud Shell as their setup access; a google cloud shell modal should show up and clicking on the launch button will redirect user to Google cloud shell page](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Users are able to add CIS_GCP Integration with Manual settings using Credentials File](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Users are able to switch credentials_type from/to Credential JSON fields ](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Users are able to add CIS_GCP Integration with Manual settings using Credentials JSON](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Users are able to switch credentials_type from/to Credential File fields ](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/cspm/cis_integration_gcp.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Test adding Cloud Security Posture Integrations KSPM EKS](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/kspm/cis_integration_eks.ts) | describe |  |  |
| [KSPM EKS Assume Role](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/kspm/cis_integration_eks.ts) | describe |  |  |
| [KSPM EKS Assume Role workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/kspm/cis_integration_eks.ts) | it |  |  |
| [KSPM EKS Direct Access](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/kspm/cis_integration_eks.ts) | describe |  |  |
| [KSPM EKS Direct Access Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/kspm/cis_integration_eks.ts) | it |  |  |
| [KSPM EKS Temporary Keys](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/kspm/cis_integration_eks.ts) | describe |  |  |
| [KSPM EKS Temporary Keys Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/kspm/cis_integration_eks.ts) | it |  |  |
| [KSPM EKS Shared Credentials](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/kspm/cis_integration_eks.ts) | describe |  |  |
| [KSPM EKS Shared Credentials Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/kspm/cis_integration_eks.ts) | it |  |  |
| [Test adding Cloud Security Posture Integrations KSPM K8S](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/kspm/cis_integration_k8s.ts) | describe |  |  |
| [KSPM K8S](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/kspm/cis_integration_k8s.ts) | describe |  |  |
| [KSPM K8S Workflow](x-pack/test/cloud_security_posture_functional/pages/cis_integrations/kspm/cis_integration_k8s.ts) | it |  |  |
| [Cloud Posture Dashboard Page](x-pack/test/cloud_security_posture_functional/pages/compliance_dashboard.ts) | describe |  |  |
| [Kubernetes Dashboard](x-pack/test/cloud_security_posture_functional/pages/compliance_dashboard.ts) | describe |  |  |
| [displays accurate summary compliance score](x-pack/test/cloud_security_posture_functional/pages/compliance_dashboard.ts) | it |  |  |
| [TODO - Cloud Dashboard](x-pack/test/cloud_security_posture_functional/pages/compliance_dashboard.ts) | describe |  | ![](https://img.shields.io/badge/todo-green) |
| [todo - displays accurate summary compliance score](x-pack/test/cloud_security_posture_functional/pages/compliance_dashboard.ts) | it |  | ![](https://img.shields.io/badge/todo-green) |
| [Access with custom roles](x-pack/test/cloud_security_posture_functional/pages/compliance_dashboard.ts) | describe |  |  |
| [Access with valid user role](x-pack/test/cloud_security_posture_functional/pages/compliance_dashboard.ts) | it |  |  |
| [todo - Access with invalid user role](x-pack/test/cloud_security_posture_functional/pages/compliance_dashboard.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) | ![](https://img.shields.io/badge/todo-green) |
| [Findings Page - Alerts](x-pack/test/cloud_security_posture_functional/pages/findings_alerts.ts) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Create detection rule](x-pack/test/cloud_security_posture_functional/pages/findings_alerts.ts) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Creates a detection rule from the Take Action button and navigates to rule page](x-pack/test/cloud_security_posture_functional/pages/findings_alerts.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Creates a detection rule from the Alerts section and navigates to rule page](x-pack/test/cloud_security_posture_functional/pages/findings_alerts.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Rule details](x-pack/test/cloud_security_posture_functional/pages/findings_alerts.ts) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [The rule page contains the expected matching data](x-pack/test/cloud_security_posture_functional/pages/findings_alerts.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Navigation](x-pack/test/cloud_security_posture_functional/pages/findings_alerts.ts) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Clicking on count of Rules should navigate to the rules page with benchmark tags as a filter](x-pack/test/cloud_security_posture_functional/pages/findings_alerts.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Clicking on count of Alerts should navigate to the alerts page](x-pack/test/cloud_security_posture_functional/pages/findings_alerts.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Findings Page - Grouping](x-pack/test/cloud_security_posture_functional/pages/findings_grouping.ts) | describe |  |  |
| [Default Grouping](x-pack/test/cloud_security_posture_functional/pages/findings_grouping.ts) | describe |  |  |
| [groups findings by resource and sort by compliance score desc](x-pack/test/cloud_security_posture_functional/pages/findings_grouping.ts) | it |  |  |
| [groups findings by rule name and sort by compliance score desc](x-pack/test/cloud_security_posture_functional/pages/findings_grouping.ts) | it |  |  |
| [groups findings by cloud account and sort by compliance score desc](x-pack/test/cloud_security_posture_functional/pages/findings_grouping.ts) | it |  |  |
| [groups findings by Kubernetes cluster and sort by compliance score desc](x-pack/test/cloud_security_posture_functional/pages/findings_grouping.ts) | it |  |  |
| [SearchBar](x-pack/test/cloud_security_posture_functional/pages/findings_grouping.ts) | describe |  |  |
| [add filter](x-pack/test/cloud_security_posture_functional/pages/findings_grouping.ts) | it |  |  |
| [remove filter](x-pack/test/cloud_security_posture_functional/pages/findings_grouping.ts) | it |  |  |
| [set search query](x-pack/test/cloud_security_posture_functional/pages/findings_grouping.ts) | it |  |  |
| [Group table](x-pack/test/cloud_security_posture_functional/pages/findings_grouping.ts) | describe |  |  |
| [shows findings table when expanding](x-pack/test/cloud_security_posture_functional/pages/findings_grouping.ts) | it |  |  |
| [Default Grouping - support muting rules](x-pack/test/cloud_security_posture_functional/pages/findings_grouping.ts) | describe |  |  |
| [groups findings by resource after muting rule](x-pack/test/cloud_security_posture_functional/pages/findings_grouping.ts) | it |  |  |
| [Old Data](x-pack/test/cloud_security_posture_functional/pages/findings_old_data.ts) | describe |  |  |
| [Findings page with old data](x-pack/test/cloud_security_posture_functional/pages/findings_old_data.ts) | describe |  |  |
| [returns no Findings KSPM](x-pack/test/cloud_security_posture_functional/pages/findings_old_data.ts) | it |  |  |
| [returns no Findings CSPM](x-pack/test/cloud_security_posture_functional/pages/findings_old_data.ts) | it |  |  |
| [Findings Page onboarding](x-pack/test/cloud_security_posture_functional/pages/findings_onboarding.ts) | describe |  |  |
| [clicking on the ](x-pack/test/cloud_security_posture_functional/pages/findings_onboarding.ts) | it |  |  |
| [clicking on the ](x-pack/test/cloud_security_posture_functional/pages/findings_onboarding.ts) | it |  |  |
| [clicking on the ](x-pack/test/cloud_security_posture_functional/pages/findings_onboarding.ts) | it |  |  |
| [Findings Page - DataTable](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | describe |  |  |
| [Table Sort](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | describe |  |  |
| [sorts by a column, should be case sensitive/insensitive depending on the column](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | it |  |  |
| [Findings - Fields selector](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | describe |  |  |
| [Add fields to the Findings DataTable](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | it |  |  |
| [Remove fields from the Findings DataTable](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | it |  |  |
| [Reset fields to default](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | it |  |  |
| [Findings Page - support muting rules](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | describe |  |  |
| [verify only enabled rules appears](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | it |  |  |
| [Access with custom roles](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | describe |  |  |
| [Access with valid user role](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | it |  |  |
| [Access with invalid user role](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | it |  |  |
| [Cloud Security Posture](x-pack/test/cloud_security_posture_functional/pages/index.ts) | describe |  |  |
| [Cloud Posture Rules Page](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Rules Page - Rules Counters](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Shows posture score when there are findings](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Clicking the posture score button leads to the dashboard](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Shows integrations count when there are findings](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Clicking the integrations counter button leads to the integration page](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Shows the failed findings counter when there are findings](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Clicking the failed findings button leads to the findings page](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Shows the disabled rules count](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Clicking the disabled rules button shows enables the disabled filter](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Shows empty state when there are no findings](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Rules Page - Bulk Action buttons](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [It should disable Enable option when there are all rules selected are already enabled ](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [It should disable both Enable and Disable options when there are no rules selected](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [It should disable Disable option when there are all rules selected are already Disabled](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Both option should not be disabled if selected rules contains both enabled and disabled rules](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Rules Page - Enable Rules and Disabled Rules Filter Toggle](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Should only display Enabled rules when Enabled Rules filter is ON](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Should only display Disabled rules when Disabled Rules filter is ON](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Rules Page - CIS Section & Rule Number filters](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Table should only show result that has the same section as in the Section filter](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Table should only show result that has the same section as in the Rule number filter](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Table should only show result that passes both Section and Rule number filter](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Rules Page - Flyout](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Users are able to Enable/Disable Rule from Switch on Rule Flyout](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Alerts section of Rules Flyout shows Disabled text when Rules are disabled](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Users are able to Enable/Disable Rule from Take Action on Rule Flyout](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Alerts section of Rules Flyout shows Detection Rule Counter component when Rules are enabled](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Vulnerabilities Page - Grouping](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities_grouping.ts) | describe |  |  |
| [Default Grouping](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities_grouping.ts) | describe |  |  |
| [groups vulnerabilities by cloud account and sort by number of vulnerabilities desc](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities_grouping.ts) | it |  |  |
| [groups vulnerabilities by CVE and sort by number of vulnerabilities desc](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities_grouping.ts) | it |  |  |
| [groups vulnerabilities by resource and sort by number of vulnerabilities desc](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities_grouping.ts) | it |  |  |
| [SearchBar](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities_grouping.ts) | describe |  |  |
| [add filter](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities_grouping.ts) | it |  |  |
| [remove filter](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities_grouping.ts) | it |  |  |
| [set search query](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities_grouping.ts) | it |  |  |
| [Group table](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities_grouping.ts) | describe |  |  |
| [shows vulnerabilities table when expanding](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities_grouping.ts) | it |  |  |
| [Vulnerabilities Page - DataTable](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities.ts) | describe |  |  |
| [SearchBar](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities.ts) | describe |  |  |
| [add filter](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities.ts) | it |  |  |
| [remove filter](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities.ts) | it |  |  |
| [set search query](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities.ts) | it |  |  |
| [Vulnerabilities - Fields selector](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities.ts) | describe |  |  |
| [Add fields to the Vulnerabilities DataTable](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities.ts) | it |  |  |
| [Remove fields from the Vulnerabilities DataTable](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities.ts) | it |  |  |
| [Reset fields to default](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities.ts) | it |  |  |
| [Vulnerability Dashboard Page](x-pack/test/cloud_security_posture_functional/pages/vulnerability_dashboard.ts) | describe |  |  |
| [Vulnerability Dashboard](x-pack/test/cloud_security_posture_functional/pages/vulnerability_dashboard.ts) | describe |  |  |
| [Page Header renders on startup](x-pack/test/cloud_security_posture_functional/pages/vulnerability_dashboard.ts) | it |  |  |
| [Stats render accurate output](x-pack/test/cloud_security_posture_functional/pages/vulnerability_dashboard.ts) | it |  |  |
| [should navigate to vulnerability findings page with high severity filter](x-pack/test/cloud_security_posture_functional/pages/vulnerability_dashboard.ts) | it |  |  |
| [should navigate to vulnerability findings page with critical severity filter and no high severity filter](x-pack/test/cloud_security_posture_functional/pages/vulnerability_dashboard.ts) | it |  |  |
</details>

