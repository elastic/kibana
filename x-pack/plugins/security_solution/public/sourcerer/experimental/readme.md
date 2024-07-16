# Experimental Sourcerer Replacement

## Introduction

This directory is a home for Discovery Components based re-implementation of the Sourcerer.

Currently, it can be enabled and used only by setting the localStorage value, like this:

```
window.localStorage.setItem('EXPERIMENTAL_SOURCERER_ENABLED', true)
```

The reason for having this feature toggle like this is we want to be able to inspect both implementations side by side,
using the same Kibana instance deployed locally (for now).

## Architecture

- Redux based 
- Limited use of useEffect or stateful hooks - in favor of thunks and redux middleware (supporting request cancellation and caching)
- Allows multiple instances of the picker - just wrap the subsection of the app with its own DataviewPickerProvider
- Data exposed back to Security Solution is memoized with `reselect` for performance
