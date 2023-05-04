# Fleet Debugger

Fleet includes a "debug" interface that provides some insight and data management capabilities around Fleet's underlying data. This interface can be used to diagnose issues, assist support engineers, and restore functionality to broken Fleet installations.

![Fleet Debugger UI Screenshot](https://user-images.githubusercontent.com/6766512/167193984-fcb100c4-729d-4a0b-ae64-2b280272da96.png)

## Accessing the Fleet debugger

The debugger is served at `<kibana>/app/fleet/_debug`. This page shares the same permissions requirement as other `/fleet` pages, so you'll need a user with the `fleet.all` permission.

## Using the Fleet debugger

The Fleet debugger provides debugger modules for the following Fleet data:

- Agent Policies
- Installed Integrations
- Saved Objects
- System Indices
- Preconfiguration
- "Orphaned" Integration Policies

Each module contains an explanation of its functionality and behavior, but generally the goal of each module is to

1. Provide visibility into the underlying data for the given object
1. Provide cleanup/reset functionality in order to recover from malformed data that may be preventing normal usage of Fleet

The debugger should be used when possible to assist with SDH's when we request things like a copy/paste of a given policy object or for some cleanup operation to be run via `cURL`. As common SDH tasks are identified, the debugger should be expanded to suit the Fleet UI team's and the support team's needs.
