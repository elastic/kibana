# Cloud Security Posture - Requirements Test Coverage

<!-- This file is auto-generated. Any changes will be overwritten. -->This document provides a summary of the requirements test coverage for Cloud Security Posture.

You can also check out the dedicated app view, which enables easier search and filter functionalities. This app needs to be updated manually, so it might not always be up to date.
[Requirement test coverage app](https://vxgs2c.csb.app/)

## Directory: x-pack/plugins/cloud_security_posture

**Total Tests:** 424 | **Skipped:** 5 (1.18%) | **Todo:** 0 (0.00%)

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
| [creates a URL to findings resource page with correct path and filter](x-pack/plugins/cloud_security_posture/public/common/hooks/use_navigate_findings.test.ts) | it |  |  |
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
| [getLimitProperties](x-pack/plugins/cloud_security_posture/public/common/utils/get_limit_properties.test.ts) | describe |  |  |
| [less items than limit](x-pack/plugins/cloud_security_posture/public/common/utils/get_limit_properties.test.ts) | it |  |  |
| [more items than limit](x-pack/plugins/cloud_security_posture/public/common/utils/get_limit_properties.test.ts) | it |  |  |
| [per page calculations are correct](x-pack/plugins/cloud_security_posture/public/common/utils/get_limit_properties.test.ts) | it |  |  |
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
| [renders with license url locator](x-pack/plugins/cloud_security_posture/public/components/cloud_posture_page.test.tsx) | it |  |  |
| [renders no license url locator](x-pack/plugins/cloud_security_posture/public/components/cloud_posture_page.test.tsx) | it |  |  |
| [renders children if setup status is indexed](x-pack/plugins/cloud_security_posture/public/components/cloud_posture_page.test.tsx) | it |  |  |
| [renders default loading state when the subscription query is loading](x-pack/plugins/cloud_security_posture/public/components/cloud_posture_page.test.tsx) | it |  |  |
| [renders default error state when the subscription query has an error](x-pack/plugins/cloud_security_posture/public/components/cloud_posture_page.test.tsx) | it |  |  |
| [renders subscription not allowed prompt if subscription is not installed](x-pack/plugins/cloud_security_posture/public/components/cloud_posture_page.test.tsx) | it |  |  |
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
| [FieldsSelectorTable](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | describe |  |  |
| [renders the table with data correctly](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | it |  |  |
| [calls onAddColumn when a checkbox is checked](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | it |  |  |
| [calls onRemoveColumn when a checkbox is unchecked](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | it |  |  |
| [View selected](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | describe |  |  |
| [should render "view all" option when filterSelected is not enabled](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | it |  |  |
| [should render "view selected" option when filterSelected is not enabled](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | it |  |  |
| [should open the view selector with button click](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | it |  |  |
| [should callback when "view all" option is clicked](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | it |  |  |
| [should callback when "view selected" option is clicked](x-pack/plugins/cloud_security_posture/public/components/cloud_security_data_table/fields_selector/fields_selector_table.test.tsx) | it |  |  |
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
| [renders ${CLOUDBEAT_GCP} Credentials JSON fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [updates ${CLOUDBEAT_GCP} Credentials JSON fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
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
| [should render setup technology selector for AWS and allow to select agent-based](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [should not render setup technology selector for KSPM](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [should not render setup technology selector for CNVM](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [should not render setup technology selector for CSPM GCP](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [should not render setup technology selector for CSPM Azure](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders Service principal with Client Certificate fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [updates Service principal with Client Certificate fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [should not render Service principal with Client Username and Password option](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it |  |  |
| [renders Service principal with Client Username and Password fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [updates Service principal with Client Username and Password fields](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.test.tsx) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [useSetupTechnology](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | describe |  |  |
| [create page flow](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | describe |  |  |
| [initializes with AGENT_BASED technology](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | it |  |  |
| [sets to AGENTLESS when agentless is available](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | it |  |  |
| [sets to AGENT_BASED when agentPolicyId differs from agentlessPolicyId](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | it |  |  |
| [calls handleSetupTechnologyChange when setupTechnology changes](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | it |  |  |
| [edit page flow](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | describe |  |  |
| [initializes with AGENT_BASED technology](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | it |  |  |
| [initializes with AGENTLESS technology if the agent policy id is "agentless"](x-pack/plugins/cloud_security_posture/public/components/fleet_extensions/setup_technology_selector/use_setup_technology.test.ts) | it |  |  |
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
| [no findings state: not-deployed - shows NotDeployed instead of findings](x-pack/plugins/cloud_security_posture/public/pages/configurations/configurations.test.tsx) | it |  |  |
| [no findings state: indexing - shows Indexing instead of findings](x-pack/plugins/cloud_security_posture/public/pages/configurations/configurations.test.tsx) | it |  |  |
| [no findings state: index-timeout - shows IndexTimeout instead of findings](x-pack/plugins/cloud_security_posture/public/pages/configurations/configurations.test.tsx) | it |  |  |
| [no findings state: unprivileged - shows Unprivileged instead of findings](x-pack/plugins/cloud_security_posture/public/pages/configurations/configurations.test.tsx) | it |  |  |
| [renders integrations installation prompt if integration is not installed](x-pack/plugins/cloud_security_posture/public/pages/configurations/configurations.test.tsx) | it |  |  |
| [<FindingsFlyout/>](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | describe |  |  |
| [Overview Tab](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | describe |  |  |
| [details and remediation accordions are open](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | it |  |  |
| [displays text details summary info](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | it |  |  |
| [Rule Tab](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | describe |  |  |
| [displays rule text details](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | it |  |  |
| [Table Tab](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | describe |  |  |
| [displays resource name and id](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | it |  |  |
| [should allow pagination with next](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | it |  |  |
| [should allow pagination with previous](x-pack/plugins/cloud_security_posture/public/pages/configurations/findings_flyout/findings_flyout.test.tsx) | it |  |  |
| [Get Filters](x-pack/plugins/cloud_security_posture/public/pages/configurations/utils/get_filters.test.ts) | describe |  |  |
| [negate an existing filter](x-pack/plugins/cloud_security_posture/public/pages/configurations/utils/get_filters.test.ts) | it |  |  |
| [<RulesContainer />](x-pack/plugins/cloud_security_posture/public/pages/rules/rules_container.test.tsx) | describe |  |  |
| [displays rules with their initial state](x-pack/plugins/cloud_security_posture/public/pages/rules/rules_container.test.tsx) | it |  |  |
| [<Rules />](x-pack/plugins/cloud_security_posture/public/pages/rules/rules.test.tsx) | describe |  |  |
| [calls Benchmark API](x-pack/plugins/cloud_security_posture/public/pages/rules/rules.test.tsx) | it |  |  |
| [Display success state when result request is resolved](x-pack/plugins/cloud_security_posture/public/pages/rules/rules.test.tsx) | it |  |  |
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
| [is Csp package installed tests](x-pack/plugins/cloud_security_posture/server/fleet_integration/fleet_integration.test.ts) | describe |  |  |
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
| [should initialize when new package is created](x-pack/plugins/cloud_security_posture/server/plugin.test.ts) | it |  |  |
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

**Total Tests:** 37 | **Skipped:** 0 (0.00%) | **Todo:** 0 (0.00%)

![](https://img.shields.io/badge/FTR-blue) ![](https://img.shields.io/badge/SERVERLESS-pink) ![](https://img.shields.io/badge/API-INTEGRATION-purple)

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

**Total Tests:** 4 | **Skipped:** 0 (0.00%) | **Todo:** 0 (0.00%)

![](https://img.shields.io/badge/FTR-blue) ![](https://img.shields.io/badge/SERVERLESS-pink)

<details>
<summary>Test Details</summary>

| Test Label | Type | Skipped | Todo |
|------------|------|---------|------|
| [Cloud Posture Dashboard Page](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/compliance_dashboard.ts) | describe |  |  |
| [Kubernetes Dashboard](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/compliance_dashboard.ts) | describe |  |  |
| [displays accurate summary compliance score](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/compliance_dashboard.ts) | it |  |  |
| [cloud_security_posture](x-pack/test_serverless/functional/test_suites/security/ftr/cloud_security_posture/index.ts) | describe |  |  |
</details>

## Directory: x-pack/test/api_integration/apis/cloud_security_posture

**Total Tests:** 62 | **Skipped:** 0 (0.00%) | **Todo:** 0 (0.00%)

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

**Total Tests:** 35 | **Skipped:** 0 (0.00%) | **Todo:** 0 (0.00%)

![](https://img.shields.io/badge/FTR-blue) ![](https://img.shields.io/badge/API-INTEGRATION-purple)

<details>
<summary>Test Details</summary>

| Test Label | Type | Skipped | Todo |
|------------|------|---------|------|
| [GET /internal/cloud_security_posture/benchmarks](x-pack/test/cloud_security_posture_api/routes/benchmarks.ts) | describe |  |  |
| [Get Benchmark API](x-pack/test/cloud_security_posture_api/routes/benchmarks.ts) | describe |  |  |
| [Verify cspm benchmark score is updated when muting rules](x-pack/test/cloud_security_posture_api/routes/benchmarks.ts) | it |  |  |
| [Verify kspm benchmark score is updated when muting rules](x-pack/test/cloud_security_posture_api/routes/benchmarks.ts) | it |  |  |
| [Verify update csp rules states API](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_bulk_update.ts) | describe |  |  |
| [mute benchmark rules successfully](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_bulk_update.ts) | it |  |  |
| [unmute rules successfully](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_bulk_update.ts) | it |  |  |
| [verify new rules are added and existing rules are set.](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_bulk_update.ts) | it |  |  |
| [mute detection rule successfully](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_bulk_update.ts) | it |  |  |
| [Expect to mute two benchmark rules and one detection rule](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_bulk_update.ts) | it |  |  |
| [Expect to save rules states when requesting to update empty object](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_bulk_update.ts) | it |  |  |
| [set wrong action input](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_bulk_update.ts) | it |  |  |
| [Tests get rules states API](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_get_states.ts) | describe |  |  |
| [get rules states successfully](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_get_states.ts) | it |  |  |
| [get empty object when rules states not exists](x-pack/test/cloud_security_posture_api/routes/csp_benchmark_rules_get_states.ts) | it |  |  |
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
| [Vulnerability Dashboard API](x-pack/test/cloud_security_posture_api/routes/vulnerabilities_dashboard.ts) | describe |  |  |
| [responds with a 200 status code and matching data mock](x-pack/test/cloud_security_posture_api/routes/vulnerabilities_dashboard.ts) | it |  |  |
| [returns a 400 error when necessary indices are nonexistent](x-pack/test/cloud_security_posture_api/routes/vulnerabilities_dashboard.ts) | it |  |  |
| [Verify cloud_security_posture telemetry payloads](x-pack/test/cloud_security_posture_api/telemetry/telemetry.ts) | describe |  |  |
| [includes only KSPM findings](x-pack/test/cloud_security_posture_api/telemetry/telemetry.ts) | it |  |  |
| [includes only CSPM findings](x-pack/test/cloud_security_posture_api/telemetry/telemetry.ts) | it |  |  |
| [includes CSPM and KSPM findings](x-pack/test/cloud_security_posture_api/telemetry/telemetry.ts) | it |  |  |
| [](x-pack/test/cloud_security_posture_api/telemetry/telemetry.ts) | it |  |  |
| [includes KSPM findings without posture_type and CSPM findings as well](x-pack/test/cloud_security_posture_api/telemetry/telemetry.ts) | it |  |  |
</details>

## Directory: x-pack/test/cloud_security_posture_functional

**Total Tests:** 137 | **Skipped:** 6 (4.38%) | **Todo:** 2 (1.46%)

![](https://img.shields.io/badge/FTR-blue) ![](https://img.shields.io/badge/HAS-TODO-green) ![](https://img.shields.io/badge/HAS-SKIP-yellow)

<details>
<summary>Test Details</summary>

| Test Label | Type | Skipped | Todo |
|------------|------|---------|------|
| [Test adding Cloud Security Posture Integrations](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | describe |  |  |
| [CNVM AWS](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | describe |  |  |
| [Hyperlink on PostInstallation Modal should have the correct URL](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [On Add Agent modal there should be modal that has Cloud Formation details as well as button that redirects user to Cloud formation page on AWS upon clicking them ](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [Clicking on Launch CloudFormation on post intall modal should lead user to Cloud Formation page](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [CIS_AWS](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | describe |  |  |
| [Initial form state, AWS Org account, and CloudFormation should be selected by default](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [Hyperlink on PostInstallation Modal should have the correct URL](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [On Add Agent modal there should be modal that has Cloud Formation details as well as button that redirects user to Cloud formation page on AWS upon clicking them ](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [Clicking on Launch CloudFormation on post intall modal should lead user to Cloud Formation page](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [CIS_GCP Organization](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | describe |  |  |
| [Switch between Manual and Google cloud shell](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are no Project ID or Organization ID provided, it should use default value](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are Project ID or Organization ID provided, it should use that value](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [Add Agent FLyout - Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are Project ID or Organization ID provided, it should use that value](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [Organization ID field on cloud shell command should only be shown if user chose Google Cloud Shell, if user chose Single Account it shouldn not show up](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [Hyperlink on PostInstallation Modal should have the correct URL](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [Clicking on Launch CloudShell on post intall modal should lead user to CloudShell page](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [CIS_GCP Single](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | describe |  |  |
| [Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are no Project ID, it should use default value](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are Project ID, it should use that value](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [Add Agent FLyout - Organization ID field on cloud shell command should only be shown if user chose Google Cloud Shell, if user chose Single Account it shouldn not show up](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [On add agent modal, if user chose Google Cloud Shell as their setup access; a google cloud shell modal should show up and clicking on the launch button will redirect user to Google cloud shell page](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [Users are able to add CIS_GCP Integration with Manual settings using Credentials File](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [Users are able to switch credentials_type from/to Credential JSON fields ](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [Users are able to add CIS_GCP Integration with Manual settings using Credentials JSON](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [Users are able to switch credentials_type from/to Credential File fields ](x-pack/test/cloud_security_posture_functional/pages/cis_integration.ts) | it |  |  |
| [Cloud Posture Dashboard Page](x-pack/test/cloud_security_posture_functional/pages/compliance_dashboard.ts) | describe |  |  |
| [Kubernetes Dashboard](x-pack/test/cloud_security_posture_functional/pages/compliance_dashboard.ts) | describe |  |  |
| [displays accurate summary compliance score](x-pack/test/cloud_security_posture_functional/pages/compliance_dashboard.ts) | it |  |  |
| [TODO - Cloud Dashboard](x-pack/test/cloud_security_posture_functional/pages/compliance_dashboard.ts) | describe |  | ![](https://img.shields.io/badge/todo-green) |
| [todo - displays accurate summary compliance score](x-pack/test/cloud_security_posture_functional/pages/compliance_dashboard.ts) | it |  | ![](https://img.shields.io/badge/todo-green) |
| [Findings Page - Alerts](x-pack/test/cloud_security_posture_functional/pages/findings_alerts.ts) | describe |  |  |
| [Create detection rule](x-pack/test/cloud_security_posture_functional/pages/findings_alerts.ts) | describe |  |  |
| [Creates a detection rule from the Take Action button and navigates to rule page](x-pack/test/cloud_security_posture_functional/pages/findings_alerts.ts) | it |  |  |
| [Creates a detection rule from the Alerts section and navigates to rule page](x-pack/test/cloud_security_posture_functional/pages/findings_alerts.ts) | it |  |  |
| [Rule details](x-pack/test/cloud_security_posture_functional/pages/findings_alerts.ts) | describe |  |  |
| [The rule page contains the expected matching data](x-pack/test/cloud_security_posture_functional/pages/findings_alerts.ts) | it |  |  |
| [Navigation](x-pack/test/cloud_security_posture_functional/pages/findings_alerts.ts) | describe |  |  |
| [Clicking on count of Rules should navigate to the rules page with benchmark tags as a filter](x-pack/test/cloud_security_posture_functional/pages/findings_alerts.ts) | it |  |  |
| [Clicking on count of Alerts should navigate to the alerts page](x-pack/test/cloud_security_posture_functional/pages/findings_alerts.ts) | it |  |  |
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
| [SearchBar](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [add filter](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [remove filter](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [set search query](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [Table Sort](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | describe | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [sorts by a column, should be case sensitive/insensitive depending on the column](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | it | ![](https://img.shields.io/badge/skipped-yellow) |  |
| [DistributionBar](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | describe |  |  |
| [filters by ${type} findings](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | it |  |  |
| [DataTable features](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | describe |  |  |
| [Edit data view field option is Enabled](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | it |  |  |
| [Findings - Fields selector](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | describe |  |  |
| [Add fields to the Findings DataTable](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | it |  |  |
| [Remove fields from the Findings DataTable](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | it |  |  |
| [Reset fields to default](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | it |  |  |
| [Findings Page - support muting rules](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | describe |  |  |
| [verify only enabled rules appears](x-pack/test/cloud_security_posture_functional/pages/findings.ts) | it |  |  |
| [Cloud Security Posture](x-pack/test/cloud_security_posture_functional/pages/index.ts) | describe |  |  |
| [Cloud Posture Rules Page](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | describe |  |  |
| [Rules Page - Rules Counters](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | describe |  |  |
| [Shows posture score when there are findings](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [Clicking the posture score button leads to the dashboard](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [Shows integrations count when there are findings](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [Clicking the integrations counter button leads to the integration page](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [Shows the failed findings counter when there are findings](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [Clicking the failed findings button leads to the findings page](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [Shows the disabled rules count](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [Clicking the disabled rules button shows enables the disabled filter](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [Shows empty state when there are no findings](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [Rules Page - Bulk Action buttons](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | describe |  |  |
| [It should disable Enable option when there are all rules selected are already enabled ](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [It should disable both Enable and Disable options when there are no rules selected](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [It should disable Disable option when there are all rules selected are already Disabled](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [Both option should not be disabled if selected rules contains both enabled and disabled rules](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [Rules Page - Enable Rules and Disabled Rules Filter Toggle](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | describe |  |  |
| [Should only display Enabled rules when Enabled Rules filter is ON](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [Should only display Disabled rules when Disabled Rules filter is ON](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [Rules Page - CIS Section & Rule Number filters](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | describe |  |  |
| [Table should only show result that has the same section as in the Section filter](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [Table should only show result that has the same section as in the Rule number filter](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [Table should only show result that passes both Section and Rule number filter](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [Rules Page - Flyout](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | describe |  |  |
| [Users are able to Enable/Disable Rule from Switch on Rule Flyout](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [Alerts section of Rules Flyout shows Disabled text when Rules are disabled](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [Users are able to Enable/Disable Rule from Take Action on Rule Flyout](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
| [Alerts section of Rules Flyout shows Detection Rule Counter component when Rules are enabled](x-pack/test/cloud_security_posture_functional/pages/rules.ts) | it |  |  |
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
| [DataTable features](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities.ts) | describe |  |  |
| [Edit data view field option is Enabled](x-pack/test/cloud_security_posture_functional/pages/vulnerabilities.ts) | it |  |  |
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

