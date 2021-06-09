# `cloud` plugin

The `cloud` plugin adds cloud specific features to Kibana.
The client-side plugin configures following values: 
- `isCloudEnabled = true` for both ESS and ECE deployments
- `cloudId` is the ID of the Cloud deployment Kibana is running on  
- `baseUrl` is the URL of the Cloud interface, for Elastic Cloud production environment the value is `https://cloud.elastic.co`
- `deploymentUrl` is the URL of the specific Cloud deployment Kibana is running on, the value is already concatenated with `baseUrl`
- `profileUrl` is the URL of the Cloud user profile page, the value is already concatenated with `baseUrl`
- `organizationUrl` is the URL of the Cloud account (& billing) page, the value is already concatenated with `baseUrl`
- `cname` value is the same as `baseUrl` on ESS but can be customized on ECE
