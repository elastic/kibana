Telemetry Implementation Guide | `infra` plugin

Welcome to the documentation on implementing custom Telemetry events using the TelemetryService. Tracking Telemetry events is part of our workflow for better understanding what users like the most and constantly improve the Observability Metrics and Logs.

Custom events provide a flexible way to track specific user behaviors and application events. By using the [`TelemetryService`](https://github.com/elastic/kibana/tree/main/x-pack/plugins/infra/public/services/telemetry), you can easily create and track custom events, allowing you to gain valuable insights into how your application is being used. 

In this documentation, we will see how to implement custom events and how to trigger them while working with React.

- [Define custom events with TelemetryService](./define-custom-events.md)
- [Examples for using custom events in the plugin](./trigger-custom-events-examples.md)