# TelemetryService Overview

The TelemetryService is a centralized service that provides a set of tracking functions to be used throughout a plugin. It makes it easy to define and report custom events using the core analytics API behind the scene.
The service is accessed via the `useKibanaContextForPlugin` custom hook, which makes it available anywhere inside the `infra` plugin.

It consists of 3 main components:

- **infraTelemetryEvents**: holds the list is exported from the [`telemetry_events.ts`](../../public/services/telemetry/telemetry_events.ts) file and contains the configuration and schema for all the custom events. Any new event configuration needs to be added here.

- **TelemetryClient**: This class provides the methods needed on the client side to report events using the core analytics API. This allows typing and centralizing the definition of the event.

- **TelemetryService**: This service class is responsible for setting up and starting the `TelemetryClient`.
It receives the custom events definition from the `infraTelemetryEvents` list, registering all the events in the plugin. Its main role is then to create and inject into the Kibana context a new instance of the `TelemetryClient`. 

Overall, the TelemetryService simplifies the process of defining and reporting custom events in a plugin. By centralizing the tracking functions and providing an easy-to-use API, it helps ensure that important metrics are collected consistently and accurately.