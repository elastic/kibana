# `cloud` plugin

The `cloud` plugin adds Cloud-specific features to Kibana.

## Client-side API

The client-side plugin provides the following interface.

### `isCloudEnabled`

This is set to `true` for both ESS and ECE deployments.

### `cloudId`

This is the ID of the Cloud deployment to which the Kibana instance belongs.

**Example:** `eastus2.azure.elastic-cloud.com:9243$59ef636c6917463db140321484d63cfa$a8b109c08adc43279ef48f29af1a3911`

### `baseUrl`

This is the URL of the Cloud interface.

**Example:** `https://cloud.elastic.co` (on the ESS production environment)

### `deploymentUrl`

This is the path to the Cloud deployment management page for the deployment to which the Kibana instance belongs. The value is already prepended with `baseUrl`.

**Example:** `{baseUrl}/deployments/bfdad4ef99a24212a06d387593686d63`

### `profileUrl`

This is the path to the Cloud User Profile page. The value is already prepended with `baseUrl`.

**Example:** `{baseUrl}/user/settings/`

### `organizationUrl`

This is the path to the Cloud Account and Billing page. The value is already prepended with `baseUrl`.

**Example:** `{baseUrl}/account/`

### `cname`

This value is the same as `baseUrl` on ESS but can be customized on ECE.

**Example:** `cloud.elastic.co` (on ESS)