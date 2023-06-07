# CoPilotPrompt

CoPilotPrompt is a React component that allows for interaction with OpenAI-compatible APIs. The component supports streaming of responses and basic error handling. As of now, it doesn't support chat or any kind of persistence. We will likely add a feedback button before the first release.

## Usage

### Step 1: Define a Prompt

Firstly, define a prompt in `x-pack/plugins/observability/common/co_pilot.ts`.

```typescript
[CoPilotPromptId.ProfilingExplainFunction]: prompt({
  params: t.type({
    library: t.string,
    functionName: t.string,
  }),
  messages: ({ library, functionName }) => {
    return [
      PERF_GPT_SYSTEM_MESSAGE,
      {
        content: `I am a software engineer. I am trying to understand what a function in a particular
          software library does.

          The library is: ${library}
          The function is: ${functionName}

          Your task is to describe what the library is and what its use cases are, and to describe what the function
          does. The output format should look as follows:

          Library description: Provide a concise description of the library
          Library use-cases: Provide a concise description of what the library is typically used for.
          Function description: Provide a concise, technical, description of what the function does.
          `,
        role: 'user',
      },
    ];
  },
});
```

Here, the key is a prompt ID, `params` define the expected inputs, and `PERF_GPT_SYSTEM_MESSAGE` is used to instruct ChatGPT's role.

### Step 2: Wrap your app in CoPilotContextProvider

Next, we need to make the CoPilot service available through context, so we can use it in our components. Wrap your app in the CoPilotContextProvider, by calling `getCoPilotService()` from the Observability plugin setup contract:

```typescript
function renderMyApp(pluginsSetup) {
  const coPilotService = pluginsSetup.observability.getCoPilotService();

  return (
    <CoPilotContextProvider value={coPilotService}>
      <MyApp />
    </CoPilotContextProvider>
  );
}
```

### Step 2: Retrieve the CoPilot Service

You can use the `useCoPilot` hook from `@kbn/observability-plugin/public` to retrieve the co-pilot service.

```typescript
const coPilot = useCoPilot();
```

Note: `useCoPilot.isEnabled()` will return undefined if co-pilot has not been enabled. You can use this to render the `CoPilotPrompt` component conditionally.

### Step 3: Use the CoPilotPrompt Component

Finally, you can use the `CoPilotPrompt` component like so:

```jsx
{
  coPilot.isEnabled() && (
    <CoPilotPrompt
      coPilot={coPilot}
      promptId={CoPilotPromptId.ProfilingExplainFunction}
      params={promptParams}
      title={i18n.translate('xpack.profiling.frameInformationWindow.explainFunction', {
        defaultMessage: 'Explain function',
      })}
    />
  );
}
```

## Properties

### coPilot

A `CoPilotService` instance. This is required for establishing connection with the OpenAI-compatible API.

### promptId

A unique identifier for the prompt. This should match one of the keys you defined in `x-pack/plugins/observability/common/co_pilot.ts`.

### params

Parameters for the prompt. These should align with the `params` in the prompt definition.

### title

The title that will be displayed on the component. It can be a simple string or a localized string via the `i18n` library.
