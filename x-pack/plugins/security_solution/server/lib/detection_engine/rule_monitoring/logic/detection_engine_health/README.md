# Detection Engine health logic

See [README](../../../../../../common/api/detection_engine/rule_monitoring/detection_engine_health/README.md) in the common folder for info about the Detection Engine health API.

This logic provides the following functionality via the `IDetectionEngineHealthClient` interface:

- Calculating health snapshots for different "slices" of rules in the cluster:
  - the whole cluster: all detection rules in all Kibana spaces
  - a given space: all rules in the current Kibana space
  - a given rule: an individual rule specified by id
- Installing assets for monitoring health, such as Kibana dashboards, etc.

## Assets for monitoring health

The assets' sources are located in the repo under `x-pack/plugins/security_solution/server/lib/detection_engine/rule_monitoring/logic/detection_engine_health/assets`.

### Assets are installed on behalf of the internal user

The important aspect to know about is that we install these assets via the saved objects `import()` method, and do it on behalf of the internal Kibana user (which is `kibana_system` by default). This user has privileges for writing saved objects out of the box, which allows our users to be able to install the assets without configuring any additional RBAC.

See `createDetectionEngineHealthClient` and `installAssetsForMonitoringHealth` for the implementation details.

### Assets' source files are JSON

Another thing to consider is that the assets are stored as `.json` files in the repo. This has pros and cons, but the important benefit here is that it allows you to make changes in the assets faster. Especially it applies to Kibana dashboards, which are large objects, and it's hard to construct a dashboard manually in the code.

### Updating the rule monitoring dashboard

For example, let's talk about updating the `dashboard_rule_monitoring.json`. It is very convenient to be able to install this dashboard via calling the `_setup` endpoint, and then go edit it in Kibana, save it, export it, and update the source file based on the exported `.ndjson` file.

Only a few adjustments would need to be done after that manually in the source file:

- obviously, formatting to JSON
- the dashboard's id has to be updated to `security-detection-rule-monitoring-<spaceId>`
- you have to make sure the references to tags are specified correctly:

  ```json
  {
    "id": "fleet-managed-<spaceId>",
    "name": "tag-ref-fleet-managed",
    "type": "tag"
  },
  {
    "id": "security-solution-<spaceId>",
    "name": "tag-ref-security-solution",
    "type": "tag"
  }
  ```
