# WorkChatApp

WorkChat application plugin


## Enabling tracing

### Langsmith tracing

Enabling langsmith tracing can be done by adding the corresponding entry to your Kibana dev config file:

```yaml
xpack.workchatApp.tracing.langsmith:
  enabled: true
  apiKey: {API-KEY}
  project: {project-name}
```