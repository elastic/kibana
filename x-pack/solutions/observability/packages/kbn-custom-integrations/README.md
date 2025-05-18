# Custom integrations package

This package provides UI components and state machines to assist with the creation (and in the future other operations) of custom integrations. For consumers the process *should* be as simple as dropping in the provider and connected components.

## Basic / quickstart usage

1. Add provider

```ts
<CustomIntegrationsProvider
    services={{ http }}
    onIntegrationCreation={onIntegrationCreation}
    initialState={{
        mode: 'create',
        fields: {
            integrationName,
            datasets: [{ name: datasetName, type: 'logs' as const }],
        },
        previouslyCreatedIntegration: lastCreatedIntegrationOptions,
    }}
>
    <ConfigureLogsContent />
</CustomIntegrationsProvider>
```

2. Include Connected form and button components

```ts
 <ConnectedCustomIntegrationsForm />
 ```

 The form will internally interact with the backing state machines.

```ts
<ConnectedCustomIntegrationsButton
    isDisabled={logFilePathNotConfigured || !namespace}
    onClick={onContinue}
/>
```

Most props are optional, here for example you may conditionally add an extra set of `isDisabled` conditions. They will be applied on top of the internal state machine conditions that ensure the button is disabled when necessary. TypeScript types can be checked for available options.

## Initial state

Initial state is just that, initial state, and isn't "reactive".

## Provider callbacks

The provider accepts some callbacks, for example `onIntegrationCreation`. Changes to these references are tracked internally, so feel free to have a callback handler that changes it's identity if needed.

An example handler:

```ts
const onIntegrationCreation: OnIntegrationCreationCallback = (
    integrationOptions
  ) => {
    const {
      integrationName: createdIntegrationName,
      datasets: createdDatasets,
    } = integrationOptions;

    setState((state) => ({
      ...state,
      integrationName: createdIntegrationName,
      datasetName: createdDatasets[0].name,
      lastCreatedIntegrationOptions: integrationOptions,
    }));
    goToStep('installElasticAgent');
  };
```

## Manual dispatching of events

Sometimes you may have a flow where it is necessary to manually update the internal state machines and bypass the connected components. This is discouraged, but it is possible for some operations. These events are exposed as `DispatchableEvents`, and these are exposed by the `useConsumerCustomIntegrations()` hook.

For example `updateCreateFields` will update the fields of the creation form in the same manner as the UI components would. 

These functions will either exist, or be `undefined`, the presence of these functions means that the corresponding state checks against the machine have already passed. For instance, `saveCreateFields()` will only exist (and not be `undefined`) when the creation form is valid. These functions therefore also fulfill the role of condition checking if needed.

Example usage:

```ts
const {
  dispatchableEvents: { updateCreateFields },
} = useConsumerCustomIntegrations();
```

## Cleanup

- For the create flow the machine will try to cleanup a previously created integration if needed (if `options.deletePrevious` is `true`). For example, imagine a wizard flow where someone has navigated forward, then navigates back, makes a change, and saves again, the machine will attempt to delete the previously created integration so that lots of rogue custom integrations aren't left behind. The provider accepts an optional `previouslyCreatedIntegration` prop that can serve as initial state.
