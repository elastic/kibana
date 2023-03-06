# URL patterns and URL precedence

## Summary

When working with state it's common to synchronise a portion to the URL.

### Patterns

Within our state machines we begin in an `uninitialized` state, from here we move in to states that represent initialisation of intitial values. This may differ between machines depending on which Kibana services (if any) are relied on. It could also be possible to have a machine that merely has defaults and does not rely on services and URL state.

For example here is an example of our `uninitialized` state immediately transitioning to `initializingFromTimeFilterService`.

```ts
uninitialized: {
    always: {
        target: 'initializingFromTimeFilterService',
    },
},
```

Our `initializingFromTimeFilterService` target might look something like this:

```ts
 initializingFromTimeFilterService: {
    on: {
        INITIALIZED_FROM_TIME_FILTER_SERVICE: {
            target: 'initializingFromUrl',
            actions: ['updateTimeContextFromTimeFilterService'],
        },
    },
    invoke: {
        src: 'initializeFromTimeFilterService',
    },
},
```

This invokes an (xstate) service to interact with the (Kibana) service and read values. We then receive an `INITIALIZED_FROM_TIME_FILTER_SERVICE` event, store what we need in context, and move to the next level of initialisation (URL).

As the target becomes `initializingFromUrl` we see much the same thing:

```ts
initializingFromUrl: {
    on: {
        INITIALIZED_FROM_URL: {
            target: 'initialized',
            actions: ['storeQuery', 'storeFilters', 'updateTimeContextFromUrl'],
        },
    },
    invoke: {
        src: 'initializeFromUrl',
    },
},
```

Eventually we receive an `INITIALIZED_FROM_URL` event, values are stored in context, and we then move to the `initialized` state.

The code that interacts with the URL is in a file called `url_state_storage_service.ts` under the directory of the machine.

This is powerful because we could have as many layers as we need here, and we will only move to the `initialized` state at the end of the chain. Since the UI won't attempt to render content until we're in an `initialized` state we are safe from subtle race conditions where we might attempt to read a value too early.

## Precedence

In the Logs solution the order of precedence is as follows:

- Defaults
- Kibana services (time filter, query, filter manager etc)
- URL

That is to say the URL has most precedence and will overwrite defaults and service values.

### Log Stream

Within the Log Stream we have the following state held in the URL (and managed by xstate):

- Log filter
    - Time range
        - From
        - To
    - Refresh interval
        - Pause
        - Value
    - Query
        - Language
        - Query
    - Filters

- Log position
    - Position
        - Time
        - Tiebreaker

#### Warning!

Due to legacy reasons the `logFilter` key should be initialised before the `logPosition` key. Otherwise the `logPosition` key might be overwritten before the `logFilter` code has had a chance to read from the key. 

#### Backwards compatibility

The Log Stream does have some legacy URL state that needs to be translated for backwards compatibility. Here is an example of the previous legacy formats:

- Log filter
    - Language
    - Query

- Log filter (this version is older than language / query)
    - Kind
    - Expression

- Log position
    - Start (now log filter > time range > from)
    - End (now log filter > time range > to)
    - StreamLive (now log filter > refresh interval > pause)
    - Position
        - Time (used to determine log filter > time range > from / to if start and end aren't set within legacy log position)
        - Tiebreaker