# Define custom events with TelemetryService

The `TelemetryService` provides an easy way to track custom events that are specific to the `infra` plugin features. 
This guide walks through the process of creating and implementing custom events into the TelemetryService, to use them easily while developing the feature with React. This is a step-by-step tutorial with code examples to be able to develop and track custom events that are tailored to your application's unique needs.

## Step 1: Add event name into event types enum

The first step is to add the name of the custom event you want to track to the [event types enum](../../public/services/telemetry/types.ts). This is a simple TypeScript enum that contains all the event types that can be tracked by the TelemetryService. For example:

```ts
export enum InfraTelemetryEventTypes {
  SEARCH_SUBMITTED = 'Search Submitted',
}
```

In this example, we're adding a new event type called `SEARCH_SUBMITTED` with a value `Search Submitted` that will be used for tracking the event.

N.B. Each custom event should also be added to the whitelist defined in the [core analytics package](../../../cloud_integrations/cloud_full_story/server/config.ts) to be tracked correctly.

## Step 2: Update types and define the event schema

Next, you'll need to update the types file for the TelemetryService to include the new event schema. 
This involves:

- Defining an interface that specifies the properties of the custom event
```ts
export interface SearchSubmittedParams {
  query: string;
  filters: string[];
}
```

- Add the created params interface to the `InfraTelemetryEventParams` union type:
```ts
export type InfraTelemetryEventParams = SomeEventParams | SearchSubmittedParams;
```

- Add into the `ITelemetryClient` interface the signature for the method we'll create into the Telemetry client for triggering the event:
```ts
export interface ITelemetryClient {
  //...
  reportSearchSubmitted(params: SearchSubmittedParams): void;
}
```

- Add into the `InfraTelemetryEvent` union the new event configuration:
```ts
export type InfraTelemetryEvent =
  | // Other event config
  | {
      eventType: InfraTelemetryEventTypes.SEARCH_SUBMITTED;
      schema: RootSchema<SearchSubmittedParams>;
    };
```

In this example, we're defining a new interface called `SearchSubmittedParams` that specifies the properties of the custom event. We're also adding a new method to the `ITelemetryClient` interface called `reportSearchSubmitted`, which takes the event params interface as its arguments.

## Step 3: Define the tracking method

Next, you'll need to define the implementation of the tracking method.
This involves creating a new method in the [TelemetryClient](../../public/services/telemetry/telemetry_client.ts) class that takes the event parameters as its arguments and tracks the event data to the target analytics platform using the core analytics API, which gets injected with the class constructor. For example:

```ts
export class TelemetryClient implements ITelemetryClient {
  constructor(private analytics: AnalyticsServiceSetup) {}

  // Other tracking methods...

  public reportSearchSubmitted = (params: SearchSubmittedParams) => {
    this.analytics.reportEvent(InfraTelemetryEventTypes.SEARCH_SUBMITTED, params);
  };
}
```

## Step 4: Add method name to telemetry client mock

If you're using a mock version of the TelemetryClient class for testing purposes, you'll need to update the [mock](../../public/services/telemetry/telemetry_client.mock.ts) to include the new track method.

```ts
export const createTelemetryClientMock = (): jest.Mocked<ITelemetryClient> => ({
  // ...
  reportSearchSubmitted: jest.fn(),
});
```

## Step 5: Test your method implementation

Finally, you'll want to test your new custom event tracking method to ensure that it's working correctly. You can do this by adding your test to the [existing tests suite](../../public/services/telemetry/telemetry_service.test.ts) for the TelemetryService, calling the tracking method with your new event type and event params, and verifying that the event call is correctly running. For example:

```ts
describe('#reportSearchSubmitted', () => {
  it('should report searches', async () => {
    const setupParams = getSetupParams();
    service.setup(setupParams);
    const telemetry = service.start();

    telemetry.reportSearchSubmitted({
      query: 'host.name : "host-0"',
      filters: ['test-filter']
    });

    expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
      InfraTelemetryEventTypes.SEARCH_SUBMITTED,
      {
        query: 'host.name : "host-0"',
        filters: ['test-filter']
      }
    );
  });
});
```

## Usage

You can check many usage examples for custom events in the [Usage examples guide](./trigger_custom_events_examples.md).