# Embeddable `<LogStream />` component

The purpose of this component is to allow you, the developer, to have your very own Log Stream in your plugin.

The plugin is exposed through `infra/public`. Since Kibana uses relative paths is up to you to find how to import it (sorry).

```tsx
import { LogStream } from '../../../../../../infra/public';
```

## Prerequisites

To use the component, there are several things you need to ensure in your plugin:

- In your plugin's `kibana.json` plugin, add `"infra"` to `requiredPlugins`.
- The component needs to be mounted inside the hiearchy of a [`kibana-react` provider](https://github.com/elastic/kibana/blob/b2d0aa7b7fae1c89c8f9e8854ae73e71be64e765/src/plugins/kibana_react/README.md#L45).

## Usage

The simplest way to use the component is with a date range, passed with the `startTimestamp` and `endTimestamp` props.

```tsx
const endTimestamp = Date.now();
const startTimestamp = endTimestamp - 15 * 60 * 1000; // 15 minutes

<LogStream startTimestamp={startTimestamp} endTimestamp={endTimestamp} />;
```

This will show a list of log entries between the time range, in ascending order (oldest first), but with the scroll position all the way to the bottom (showing the newest entries)

### Filtering data

You might want to show specific data for the purpose of your plugin. Maybe you want to show log lines from a specific host, or for an APM trace. You can pass a KQL expression via the `query` prop.

```tsx
<LogStream
  startTimestamp={startTimestamp}
  endTimestamp={endTimestamp}
  query="trace.id: 18fabada9384abd4"
/>
```

### Modifying rendering

By default the component will initially load at the bottom of the list, showing the newest entries. You can change what log line is shown in the center via the `center` prop. The prop takes a [`LogEntriesCursor`](https://github.com/elastic/kibana/blob/0a6c748cc837c016901f69ff05d81395aa2d41c8/x-pack/plugins/infra/common/http_api/log_entries/common.ts#L9-L13).

```tsx
<LogStream
  startTimestamp={startTimestamp}
  endTimestamp={endTimestamp}
  center={{ time: ..., tiebreaker: ... }}
/>
```

If you want to highlight a specific log line, you can do so by passing its ID in the `highlight` prop.

```tsx
<LogStream startTimestamp={startTimestamp} endTimestamp={endTimestamp} highlight="abcde12345" />
```

### Source configuration

The infra plugin has the concept of "source configuration" to store settings for the logs UI. The component will use the source configuration to determine which indices to query or what columns to show.

By default the `<LogStream />` uses the `"default"` source confiuration, but if your plugin uses a different one you can specify it via the `sourceId` prop.

```tsx
<LogStream startTimestamp={startTimestamp} endTimestamp={endTimestamp} sourceId="my_source" />
```

### Considerations

As mentioned in the prerequisites, the component relies on `kibana-react` to access kibana's core services. If this is not the case the component will throw an exception when rendering. We advise to use an `<EuiErrorBoundary>` in your component hierarchy to catch this error if necessary.
