# Session View

Session View is meant to provide a visualization into what is going on in a particular Linux environment where the agent is running. It looks likes a terminal emulator; however, it is a tool for introspecting process activity and understanding user and service behaviour in your Linux servers and infrastructure. It is a time-ordered series of process executions displayed in a tree over time.

It provides an audit trail of:

- Interactive processes being entered by a user into the terminal - User Input
- Processes and services which do not have a controlling tty (ie are not interactive)
- Output which is generated as a result of process activity - Output
- Nested sessions inside the entry session - Nested session (Note: For now nested sessions will display as they did at Cmd with no special handling for TMUX)
- Full telemetry about the process initiated event. This will include the information specified in the Linux logical event model
- Who executed the session or process, even if the user changes.

## Development

## Tests

### Unit tests

From kibana path in your terminal go to this plugin root:

```bash
cd x-pack/plugins/session_view
```

Then run jest with:

```bash
yarn test:jest
```

Or if running from kibana root, you can specify the `-i` to specify the path:

```bash
yarn test:jest -i x-pack/plugins/session_view/
```
