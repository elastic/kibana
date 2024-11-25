## Telemetry data view generation script

The purpose of the script is to map telemetry fields to runtime fields on the appropriate security solution ebt data views on the staging cluster. This can be used to automate the addition of new fields to the data views. 

### Events
- The browser ebt events come from `telemetryEvents` imported from `x-pack/plugins/security_solution/public/common/lib/telemetry/events/telemetry_events`
- The server ebt events come from:
  - `events` imported from `x-pack/plugins/elastic-assistant/server/lib/telemetry/event_based_telemetry`
  - `telemetryEvents` imported from `x-pack/plugins/security_solution_serverless/server/telemetry/event_based_telemetry`
  - `events` imported from `x-pack/plugins/security_solution/server/lib/telemetry/event_based/events`

If you have further events to be included in the data views, please update the script to include the event schema.

### Usage

1. Login with Vault (`vault login -method oidc`), ensure you have siem-team access. If you have never accessed Vault before, follow [these instructions](https://github.com/elastic/infra/blob/master/docs/vault/README.md)
2. cd into this directory
3. Run the script with the appropriate arguments. By default, the script will run for the `security-solution-ebt-kibana-browser` data view in the `securitysolution` space. If you want to run the script for the server data view, pass the `--telemetry_type` argument with the value `server`.

```bash
# Run the script for the security-solution-ebt-kibana-browser data view
./build_ebt_data_view.sh

# Run the script for the security-solution-ebt-server data view
./build_ebt_data_view.sh --telemetry_type=server
```

### Data view recovery

If a security solution ebt data view is for some reason deleted, upload the saved object that is committed in this directory to the staging cluster. This will recreate the data view with the correct mappings. Then you can run this script to ensure any new fields get added.

#### Why upload the saved object? Why not just run this script?

There are some fields not covered by this script, at least for the security-solution-ebt-kibana-browser data view (ex: `day_of_week`). I'm not sure where they came from. In order to be on the safe side, the data view saved objects will be updated per minor release to ensure that all fields are covered.

### Production data views

This script manages the staging data views. To make updates to the production data views, export the saved objects from staging and upload them to production.
