## Summary

Within the Infra plugin (specifically Logs) we use [Xstate](https://xstate.js.org/) for managing state. Xstate brings finite state machines and statecharts to JavaScript and TypeScript. The [Xstate docs](https://xstate.js.org/docs/) themselves are good, but this documentation serves to highlight patterns and certain choices we've made with regards to solution usage.

## Optional actions / exposing events

Xstate has methods and means for parent <-> child communication, and when we want to communicate from child to parent the most convenient method is to use [`sendParent()`](https://xstate.js.org/docs/guides/communication.html#sending-events). In cases where the parent <-> child relationship is "baked in" this is by far the easiest and most direct method to use. However, there are occasions where you might have a more generic machine that you want to compose within another machine so that it (the parent) can respond to certain events. In this case blindly responding to the events that result from `sendParent()` would require knowing about the internals of that machine, even though the relationship is more generic in nature (and the child machine may well be used elsewhere). In this case it is nice to have a more explicit contract, so that we can say "hello actor, what events do you emit?" and then we can selectively respond to those.

The pattern we have used to deal with this involves assigning the actions in an optional manner, with them being a no-op by default.

### Example

In Logs we have a scenario where there is a more generic `LogView` state machine, and a more specific `LogStream` state machine. The stream machine needs to respond to the log view machine (but it's entirely possible the log view machine *could* be composed elsewhere).

In the pure implementation of the `LogView` machine the following actions are defined as no-ops:

```ts
actions: {
    notifyLoadingStarted: actions.pure(() => undefined),
    notifyLoadingSucceeded: actions.pure(() => undefined),
    notifyLoadingFailed: actions.pure(() => undefined)
}
```

We can now override these actions when that machine is created elsewhere. For example, let's say we were spawning a `LogView` machine with optional actions:

```ts
spawnLogViewMachine: assign({
    logViewMachineRef: () =>
      spawn(
        createLogViewStateMachine().withConfig({
          actions: {
            notifyLoadingStarted: sendIfDefined(SpecialTargets.Parent)(
              logViewListenerEventSelectors.loadingLogViewStarted
            ),
            notifyLoadingSucceeded: sendIfDefined(SpecialTargets.Parent)(
              logViewListenerEventSelectors.loadingLogViewSucceeded
            ),
            notifyLoadingFailed: sendIfDefined(SpecialTargets.Parent)(
              logViewListenerEventSelectors.loadingLogViewFailed
            ),
          },
        }),
        'logViewMachine'
      ),
  }),
},
```

Here the `LogView` machine would instead send an event to the parent that spawned the machine (rather than the no-op).

When the `loading` state is entered within the `LogView` machine the `notifyLoadingStarted` action is executed. 

```ts
loading: {
    entry: 'notifyLoadingStarted'
},
```

`logViewNotificationEventSelectors.loadingLogViewStarted` (and company) define the event based on the shape of what's in `context`, for example:

```ts
loadingLogViewStarted: (context: LogViewContext) =>
    'logViewId' in context
      ? ({
          type: 'loadingLogViewStarted',
          logViewId: context.logViewId,
        } as LogViewNotificationEvent)
      : undefined,
```

The consumer can now choose to respond to this event in some way. 

## Event notifications from outside of a machine

Xstate has several mechanisms for parent <-> child communication, a parent can (for example) [`invoke`](https://xstate.js.org/docs/guides/communication.html#the-invoke-property) a child actor, or [`spawn`](https://xstate.js.org/docs/guides/actors.html#spawning-actors) an actor and assign it to `context`. However, we might need to communicate with an actor that was instantiated outside of the machine, here the parent -> child relationship is less obvious, but we still want to enforce a pattern that makes this obvious and "contractual".

In our real `LogView` -> `Stream` example the `LogView` machine is actually instantiated in a very different part of the React hierarchy to the stream machine, but we still want to respond to these events. The problem is the stream machine will no longer be directly spawning or invoking the `LogView` machine, so there is no strict parent <-> child relationship.

We have opted to use a notification channel approach to this.

When the machine is created it is passed a notification channel:

```ts
 createLogStreamPageStateMachine({
    logViewStateNotifications,
}),
```

Within our UI this channel is created within a hook that manages `LogView`s (but it could be created anywhere):

`const [logViewStateNotifications] = useState(() => createLogViewNotificationChannel());`

Now when the stream machine is created a `logViewNotifications` service can be defined, and that service is the result of calling `createService()` on the channel, this returns an Observable. 

```ts
createPureLogStreamPageStateMachine().withConfig({
    services: {
      logViewNotifications: () => logViewStateNotifications.createService(),
    },
  });
```

The service itself is `invoked`:

```ts
invoke: {
    src: 'logViewNotifications',
},
```

When the Observable emits these events will be responded to via the machine.

## createPure() vs create()

We have developed a pattern whereby each machine has a pure and non-pure version. The pure version defines the core parts of the machine (states, actions, transitions etc), this is useful for things like tests. It contains the things that are *always* required. Then there is the non-pure version (this can be thought of as the UI-centric version) this version will inject the real services, actions etc.

Pure example:

```ts
export const createPureLogStreamPageStateMachine = (initialContext: LogStreamPageContext = {}) =>
  createMachine<LogStreamPageContext, LogStreamPageEvent, LogStreamPageTypestate>(
    {
      context: initialContext,
      predictableActionArguments: true,
      invoke: {
        src: 'logViewNotifications',
      },
      id: 'logStreamPageState',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          on: {
            loadingLogViewStarted: {
              target: 'loadingLogView',
            },
            loadingLogViewFailed: {
              target: 'loadingLogViewFailed',
              actions: 'storeLogViewError',
            },
          },
        },
        // More states
    },
    {
      actions: {
        storeLogViewError: assign((_context, event) =>
          event.type === 'loadingLogViewFailed'
            ? ({ logViewError: event.error } as LogStreamPageContextWithLogViewError)
            : {}
        ),
      },
      guards: {
        hasLogViewIndices: (_context, event) =>
          event.type === 'loadingLogViewSucceeded' &&
          ['empty', 'available'].includes(event.status.index),
      },
    }
  );
```

Non-pure example:

```ts
export const createLogStreamPageStateMachine = ({
  logViewStateNotifications,
}: {
  logViewStateNotifications: LogViewNotificationChannel;
}) =>
  createPureLogStreamPageStateMachine().withConfig({
    services: {
      logViewNotifications: () => logViewStateNotifications.createService(),
    },
  });
```

Here we call `withConfig()` which returns a new instance with our overrides, in this case we inject the correct services.

## Pairing with React

There is a [`@xstate/react` library](https://xstate.js.org/docs/recipes/react.html#usage-with-react) that provides some helpful hooks and utilities for combining React and Xstate.

We have opted to use a provider approach for providing state to the React hierarchy, e.g.:

```ts
export const useLogStreamPageState = ({
  logViewStateNotifications,
}: {
  logViewStateNotifications: LogViewNotificationChannel;
}) => {
  const logStreamPageStateService = useInterpret(
    () =>
      createLogStreamPageStateMachine({
        logViewStateNotifications,
      })
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

## TypeScript usage

Our usage of Xstate is fully typed. We have opted for a [Typestate](https://xstate.js.org/docs/guides/typescript.html#typestates) approach, which allows us to narrow down the shape of `context` based on the state `value`. [Typegen](https://xstate.js.org/docs/guides/typescript.html#typegen) may be a possible solution in the future, but at the time of writing this causes some friction with the way we work.

## DX Tools

We recommend using the [Xstate VSCode extension](https://marketplace.visualstudio.com/items?itemName=statelyai.stately-vscode), this includes various features, but arguably the most useful is being able to visually work with the machine. Even if you don't work with VSCode day to day it may be worth installing to utilise this extension for Xstate work.

When [devTools](https://xstate.js.org/docs/guides/interpretation.html#options) are enabled you can also make use of the [Redux DevTools extension](https://github.com/reduxjs/redux-devtools) to view information about your running state machines.

You can also use [Stately.ai](https://stately.ai/) directly in the browser.