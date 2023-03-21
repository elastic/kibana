# `cloud` plugin

The `cloud` plugin adds Cloud-specific features to Kibana.

## Client-side API

The client-side plugin provides the following interface.

### `isCloudEnabled`

This is set to `true` for both ESS and ECE deployments.

### `cloudId`

This is the ID of the Cloud deployment to which the Kibana instance belongs.

**Example:** `eastus2.azure.elastic-cloud.com:9243$59ef636c6917463db140321484d63cfa$a8b109c08adc43279ef48f29af1a3911`

**NOTE:** The `cloudId` is a concatenation of the deployment name and a hash. Users can update the deployment name, changing the `cloudId`. However, the changed `cloudId` will not be re-injected into `kibana.yml`. If you need the current `cloudId` the best approach is to split the injected `cloudId` on the semi-colon, and replace the first element with the `persistent.cluster.metadata.display_name` value as provided by a call to `GET _cluster/settings`.

### `baseUrl`

This is the URL of the Cloud interface.

**Example:** `https://cloud.elastic.co` (on the ESS production environment)

### `deploymentUrl`

This is the path to the Cloud deployment management page for the deployment to which the Kibana instance belongs. The value is already prepended with `baseUrl`.

**Example:** `{baseUrl}/deployments/bfdad4ef99a24212a06d387593686d63`

### `snapshotsUrl`

This is the path to the Snapshots page for the deployment to which the Kibana instance belongs. The value is already prepended with `deploymentUrl`.

**Example:** `{deploymentUrl}/elasticsearch/snapshots`

### `profileUrl`

This is the path to the Cloud User Profile page. The value is already prepended with `baseUrl`.

**Example:** `{baseUrl}/user/settings/`

### `organizationUrl`

This is the path to the Cloud Account and Billing page. The value is already prepended with `baseUrl`.

**Example:** `{baseUrl}/account/`

### `cname`

This value is the same as `baseUrl` on ESS but can be customized on ECE.

**Example:** `cloud.elastic.co` (on ESS)

### `trial_end_date`

The end date for the Elastic Cloud trial. Only available on Elastic Cloud.

**Example:** `2020-10-14T10:40:22Z`

### `is_elastic_staff_owned`

`true` if the deployment is owned by an Elastician. Only available on Elastic Cloud.