# Patterns for using XState with React

## Modelling UI state

The core idea is to have a top-level state machines that corresponds to and "owns" the state of each respective page or section in the UI. Its states are designed to match the decision tree that is performed in the React component hierarchy about which layout is applied and which components should be rendered.

> **Example:** The page should render an empty state when no log indices can be found, but render the log stream including the search bar when log indices are available.

That means that branches to render one component or the other should ideally be performed based on the result of the respective `pageState.matches()` call (more specific examples later in the section about connecting components).

In addition to just representing the UI decision tree, the purpose of the page state machine is also to invoke service state machines, that perform side-effects like data loading or state synchronization with other parts of Kibana.

> **Example:** The `LogView` service state machine resolves the log view and notifies about its availability via special notification events.

> **Example:** The `LogStreamQuery` service state machine interacts with Kibana's `querystring`, `filterManager` and URL state facilities and notifies the page state machine about changes.

## Interpreting and providing UI state machines

There is a [`@xstate/react` library](https://xstate.js.org/docs/recipes/react.html#usage-with-react) that provides some helpful hooks and utilities for combining React and Xstate.

We have opted to use a provider approach for providing state to the React hierarchy, e.g.:

```typescript
export const useLogStreamPageState = ({
  kibanaQuerySettings,
  logViewStateNotifications,
  queryStringService,
  toastsService,
  filterManagerService,
  urlStateStorage,
  useDevTools = isDevMode(),
}: {
  useDevTools?: boolean;
} & LogStreamPageStateMachineDependencies) => {
  const logStreamPageStateService = useInterpret(
    () =>
      createLogStreamPageStateMachine({
        kibanaQuerySettings,
        logViewStateNotifications,
        queryStringService,
        toastsService,
        filterManagerService,
        urlStateStorage,
      }),
    { devTools: useDevTools }
  );

  return logStreamPageStateService;
};

export const [LogStreamPageStateProvider, useLogStreamPageStateContext] =
  createContainer(useLogStreamPageState);
```

[`useInterpret`](https://xstate.js.org/docs/packages/xstate-react/#useinterpret-machine-options-observer) returns a **static** reference:

> returns a static reference (to just the interpreted machine) which will not rerender when its state changes

When dealing with state it is best to use [selectors](https://xstate.js.org/docs/packages/xstate-react/#useselector-actor-selector-compare-getsnapshot), the `useSelector` hook can significantly increase performance over `useMachine`:

> This hook will only cause a rerender if the selected value changes, as determined by the optional compare function.

## Consuming UI state machines

So we want to translate the UI layout decision tree that the page state machine represents into a React hierarchy. At the same time we want to keep the individual components on the page independent of the specific page structure so they can be re-used in different contexts.

> **Example:** The component that renders the log stream is used in the log stream page of the Logs UI, but also in a dashboard embeddable and a shared React component. These "parent components" each have similar, but not identical state structures.

The redux community has solved that problem using the "connect" pattern, which we should be able to apply with a few small modifications as well. At the core the idea is to leave the presentational components decoupled from a specific page-wide state structure and just have them consume the relevant data and callbacks as props.

> **Example:** The component that renders the log stream receives log entries and scroll position reporting callbacks as props instead of accessing page-specific state from the context.

In order to take advantage of the fact that the page layout decisions are already encoded in the page state machine itself, we can use a three-layer component structure:

- **Presentational components** receive detailed domain-specific data and callbacks as props
- **"For state" components** receive a page state machine state (and if needed a "send"/"dispatch" callback) as props
- **"Connected" components** access the page state machine from context

This layering preserves several desirable properties:

- Presentational components can be re-used on different pages and tested in unit-tests and storybooks by just passing the respective props.
- "For state" components are specific to the page state and can match states to branch into different page layouts. They can be tested in unit-tests and storybooks by just passing the corresponding page state data structures.
- "Connected" components know how to gain access to the page state machine from the context and subscribe to their changes using `useActor`. They each work with a specific page state machine provider. They're harder to test, but very slim and of low complexity.

Assuming the UI state machine is provided as shown in the earlier section, the consumption could look like this:

**A connected component:**
```typescript
export const ConnectedStreamPageContent: React.FC = () => {
  const logStreamPageStateService = useLogStreamPageStateContext();

  const [logStreamPageState] = useActor(logStreamPageStateService);

  return <StreamPageContentForState logStreamPageState={logStreamPageState} />;
};
```

**A "for state" layout component:**
```typescript
export const StreamPageContentForState: React.FC<{ logStreamPageState: LogStreamPageState }> = ({
  logStreamPageState, // <-- this could be any state of the page state machine
}) => {
  if (logStreamPageState.matches('uninitialized') || logStreamPageState.matches('loadingLogView')) {
    return <SourceLoadingPage />;
  } else if (logStreamPageState.matches('loadingLogViewFailed')) {
    return <ConnectedLogViewErrorPage />;
  } else if (logStreamPageState.matches('missingLogViewIndices')) {
    return <StreamPageMissingIndicesContent />;
  } else if (logStreamPageState.matches({ hasLogViewIndices: 'initialized' })) {
    return ( // <-- here the matching has narrowed the state to `hasLogViewIndices.initialized`
      <LogStreamPageContentProviders logStreamPageState={logStreamPageState}>
        <StreamPageLogsContentForState logStreamPageState={logStreamPageState} />
      </LogStreamPageContentProviders>
    );
  } else {
    return <InvalidStateCallout state={logStreamPageState} />;
  }
};
```

**A "for state" content component**
```typescript
type InitializedLogStreamPageState = MatchedStateFromActor<
  LogStreamPageActorRef,
  { hasLogViewIndices: 'initialized' }
>;

export const StreamPageLogsContentForState = React.memo<{
  logStreamPageState: InitializedLogStreamPageState; // <-- this expects to be rendered in a specific state and the compiler will enforce that
}>(({ logStreamPageState }) => {
  const {
    context: { parsedQuery },
  } = logStreamPageState;

  return <StreamPageLogsContent filterQuery={parsedQuery} />;
});
```
