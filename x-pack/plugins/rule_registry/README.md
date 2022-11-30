# Rule Registry

The rule registry plugin aims to make it easy for rule type producers to have their rules produce the data that they need to build rich experiences on top of a unified experience, without the risk of mapping conflicts.

The plugin installs default component templates and a default lifecycle policy that rule type producers can use to create index templates.

It also exposes a rule data client that will create or update the index stream that rules will write data to. It will not do so on plugin setup or start, but only when data is written.

## Configuration

By default, these indices will be prefixed with `.alerts`. To change this, for instance to support legacy multitenancy, set the following configuration option:

```yaml
xpack.ruleRegistry.index: 'myAlerts'
```

The above produces an alerts index prefixed `.alerts-myAlerts`.

To disable writing entirely:

```yaml
xpack.ruleRegistry.write.enabled: false
```

## Setting up the index template

On plugin setup, rule type producers can create the index template as follows:

```ts
// get the FQN of the component template. All assets are prefixed with the configured `index` value, which is `.alerts` by default.

const componentTemplateName = plugins.ruleRegistry.getFullAssetName('apm-mappings');

// if write is disabled, don't install these templates
if (!plugins.ruleRegistry.isWriteEnabled()) {
  return;
}

// create or update the component template that should be used
await plugins.ruleRegistry.createOrUpdateComponentTemplate({
  name: componentTemplateName,
  body: {
    template: {
      settings: {
        number_of_shards: 1,
      },
      // mappingFromFieldMap is a utility function that will generate an
      // ES mapping from a field map object. You can also define a literal
      // mapping.
      mappings: mappingFromFieldMap(
        {
          [SERVICE_NAME]: {
            type: 'keyword',
          },
          [SERVICE_ENVIRONMENT]: {
            type: 'keyword',
          },
          [TRANSACTION_TYPE]: {
            type: 'keyword',
          },
          [PROCESSOR_EVENT]: {
            type: 'keyword',
          },
        },
        'strict'
      ),
    },
  },
});

// Install the index template, that is composed of the component template
// defined above, and others. It is important that the technical component
// template is included. This will ensure functional compatibility across
// rule types, for a future scenario where a user will want to "point" the
// data from a rule to a different index.
await plugins.ruleRegistry.createOrUpdateIndexTemplate({
  name: plugins.ruleRegistry.getFullAssetName('apm-index-template'),
  body: {
    index_patterns: [plugins.ruleRegistry.getFullAssetName('observability.apm*')],
    composed_of: [
      // Technical component template, required
      plugins.ruleRegistry.getFullAssetName(TECHNICAL_COMPONENT_TEMPLATE_NAME),
      componentTemplateName,
    ],
  },
});

// Finally, create the rule data client that can be injected into rule type
// executors and API endpoints
const ruleDataClient = new RuleDataClient({
  alias: plugins.ruleRegistry.getFullAssetName('observability.apm'),
  getClusterClient: async () => {
    const coreStart = await getCoreStart();
    return coreStart.elasticsearch.client.asInternalUser;
  },
  ready,
});

// to start writing data, call `getWriter().bulk()`. It supports a `namespace`
// property as well, that for instance can be used to write data to a space-specific
// index.
const writer = await ruleDataClient.getWriter();
await writer.bulk({
  body: eventsToIndex.flatMap((event) => [{ index: {} }, event]),
});

// to read data, simply call ruleDataClient.getReader().search:
const response = await ruleDataClient.getReader().search({
  body: {
    query: {},
    size: 100,
    fields: ['*'],
    sort: {
      '@timestamp': 'desc',
    },
  },
  allow_no_indices: true,
});
```

## Schema

The following fields are defined in the technical field component template and should always be used:

- `@timestamp`: the ISO timestamp of the alert event. For the lifecycle rule type helper, it is always the value of `startedAt` that is injected by the Kibana alerting framework.
- `event.kind`: signal (for the changeable alert document), state (for the state changes of the alert, e.g. when it opens, recovers, or changes in severity), or metric (individual evaluations that might be related to an alert).
- `event.action`: the reason for the event. This might be `open`, `close`, `active`, or `evaluate`.
- `tags`: tags attached to the alert. Right now they are copied over from the rule.
- `kibana.alert.rule.rule_type_id`: the identifier of the rule type, e.g. `apm.transaction_duration`
- `kibana.alert.rule.uuid`: the saved objects id of the rule.
- `kibana.alert.rule.name`: the name of the rule (as specified by the user).
- `kibana.alert.rule.category`: the name of the rule type (as defined by the rule type producer)
- `kibana.alert.rule.consumer`: the feature which produced the alert (inherited from the rule producer field). Usually a Kibana feature id like `apm`, `siem`...
- `kibana.alert.instance.id`: the id of the alert instance, that is unique within the context of the rule execution it was created in. E.g., for a rule that monitors latency for all services in all environments, this might be `opbeans-java:production`.
- `kibana.alert.uuid`: the unique identifier for the alert during its lifespan. If an alert recovers (or closes), this identifier is re-generated when it is opened again.
- `kibana.alert.status`: the status of the alert. Can be `active` or `recovered`.
- `kibana.alert.start`: the ISO timestamp of the time at which the alert started.
- `kibana.alert.end`: the ISO timestamp of the time at which the alert recovered.
- `kibana.alert.duration.us`: the duration of the alert, in microseconds. This is always the difference between either the current time, or the time when the alert recovered.
- `kibana.alert.severity`: the severity of the alert, as a keyword (e.g. critical).
- `kibana.alert.evaluation.value`: The measured (numerical value).
- `kibana.alert.threshold.value`: The threshold that was defined (or, in case of multiple thresholds, the one that was exceeded).
- `kibana.alert.ancestors`: the array of ancestors (if any) for the alert.
- `kibana.alert.depth`: the depth of the alert in the ancestral tree (default 0).
- `kibana.alert.building_block_type`: the building block type of the alert (default undefined).
- `kibana.alert.time_range`: the time range of an alert. (default undefined).

# Alerts as data

Alerts as data can be interacted with using the AlertsClient api found in `x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts`

This api includes public methods such as

[x] getFullAssetName
[x] getAlertsIndex
[x] get
[x] update
[ ] bulkUpdate (TODO)
[ ] find (TODO)
