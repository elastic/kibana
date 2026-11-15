# @kbn/investigation-output

Renders the summary and output of an investigation (a root-cause-analysis run by an AI
agent) so it can be embedded anywhere in Kibana — a significant-event flyout, a case, a
chat panel, etc.

- `InvestigationOutput` — presentational component. Takes no service dependencies; the
  caller supplies a `status` (`loading` / `running` / `complete` / `unavailable`), the
  `investigation` from the shared investigations API, and an optional `error` detail message.
- `useInvestigation` — hook that sources those props for an investigation id (the investigation's
  Agent Builder conversation id): it reads `GET /internal/investigations/investigations/{id}` and
  reads it again every few seconds while `in_progress` is true.

- `EvidenceList`, `EvidenceItem`, `EvidenceChart`, and `ImpactSection` render the evidence the
  agent recorded (self-contained static charts and Markdown) and the impact, in the shapes the
  shared investigations API returns. `InvestigationOutput` uses them for hypotheses and impact.
