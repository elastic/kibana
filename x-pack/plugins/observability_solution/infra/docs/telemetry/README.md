# Telemetry Implementation Guide | `infra` plugin

Welcome to the documentation on implementing custom Telemetry events using the TelemetryService. Tracking Telemetry events is part of our workflow for better understanding what users like the most and constantly improving the Observability Metrics and Logs.

Custom events provide a flexible way to track specific user behaviors and application events. By using the [`TelemetryService`](https://github.com/elastic/kibana/tree/main/x-pack/plugins/observability_solution/infra/public/services/telemetry), you can easily create and track custom events, allowing you to gain valuable insights into how your application is being used.

In this documentation, we will see how to implement custom events and how to trigger them while working with React.

- [TelemetryService Overview](./telemetry_service_overview.md)
- [Define custom events with TelemetryService](./define_custom_events.md)
- [Examples of using custom events in the plugin](./trigger_custom_events_examples.md)
