# Kibana Security Plugin

See [Configuring security in
Kibana](https://www.elastic.co/guide/en/kibana/current/using-kibana-with-security.html).

## Audit logging

### Example

```typescript
const auditLogger = securitySetup.audit.asScoped(request);
auditLogger.log({
  message: 'User is updating dashboard [id=123]',
  event: {
    action: 'saved_object_update',
    category: EventCategory.DATABASE,
    type: EventType.CHANGE,
    outcome: EventOutcome.UNKNOWN,
  },
  kibana: {
    saved_object: { type: 'dashboard', id: '123' },
  },
});
```

### What events should be logged?

The purpose of an audit log is to support compliance, accountability and
security by capturing who performed an action, what action was performed and
when it occurred. It is not the purpose of an audit log to aid with debugging
the system or provide usage statistics.

**Kibana guidelines:**

Each API call to Kibana will result in a record in the audit log that captures
general information about the request (`http_request` event).

In addition to that, any operation that is performed on a resource owned by
Kibana (e.g. saved objects) and that falls in the following categories, should
be included in the audit log:

- System access (incl. failed attempts due to authentication errors)
- Data reads (incl. failed attempts due to authorisation errors)
- Data writes (incl. failed attempts due to authorisation errors)

If Kibana does not own the resource (e.g. when running queries against user
indices), then auditing responsibilities are deferred to Elasticsearch and no
additional events will be logged.

**Examples:**

For a list of audit events that Kibana currently logs see:
`docs/user/security/audit-logging.asciidoc`

### When should an event be logged?

Due to the asynchronous nature of most operations in Kibana, there is an
inherent tradeoff between the following logging approaches:

- Logging the **intention** before performing an operation, leading to false
  positives if the operation fails downstream.
- Logging the **outcome** after completing an operation, leading to missing
  records if Kibana crashes before the response is received.
- Logging **both**, intention and outcome, leading to unnecessary duplication
  and noisy/difficult to analyse logs.

**Kibana guidelines:**

- **Write operations** should be logged immediately after all authorisation
  checks have passed, but before the response is received (logging the
  intention). This ensures that a record of every operation is persisted even in
  case of an unexpected error.
- **Read operations**, on the other hand, should be logged after the operation
  completed (logging the outcome) since we won't know what resources were
  accessed before receiving the response.
- Be explicit about the timing and outcome of an action in your messaging. (e.g.
  "User has logged in" vs. "User is creating dashboard")

### Can an action trigger multiple events?

- A request to Kibana can perform a combination of different operations, each of
  which should be captured as separate events.
- Operations that are performed on multiple resources (**bulk operations**)
  should be logged as separate events, one for each resource.
- Actions that kick off **background tasks** should be logged as separate
  events, one for creating the task and another one for executing it.
- **Internal checks**, which have been carried out in order to perform an
  operation, or **errors** that occured as a result of an operation should be
  logged as an outcome of the operation itself, using the ECS `event.outcome`
  and `error` fields, instead of logging a separate event.
- Multiple events that were part of the same request can be correlated in the
  audit log using the ECS `trace.id` property.
