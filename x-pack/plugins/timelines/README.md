# timelines
Timelines is a plugin that provides a grid component with accompanying server side apis to help users identify events of interest and perform root cause analysis within Kibana.


## Using timelines in another plugin
- Add `TimelinesPluginUI` to Kibana plugin `SetupServices` dependencies:

```ts
timelines: TimelinesPluginUI;
```
- Once `timelines` is added as a required plugin in the consuming plugin's kibana.json, timeline functionality will be available as any other kibana plugin, ie PluginSetupDependencies.timelines.getTimeline()
