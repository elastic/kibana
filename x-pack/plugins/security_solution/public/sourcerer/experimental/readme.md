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

TODO
