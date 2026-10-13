# @kbn/investigation-output

Renders the summary and output of an investigation (a root-cause-analysis run by an AI
agent) so it can be embedded anywhere in Kibana — a significant-event flyout, a case, a
chat panel, etc.

- `InvestigationOutput` — presentational component. Takes no service dependencies; the
  caller supplies a `status` (`running` / `loading` / `complete` / `failed` /
  `unavailable`), the latest `state`, and an optional `error` detail message.
- `useInvestigationState` — hook that sources those props for a given execution id: it
  follows the agent execution's live event stream while the investigation runs (resuming
  after transient stream failures), and reads the persisted final result off the workflow
  execution once it is terminal, caching terminal results across remounts.
