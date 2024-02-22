### **1. Observability AI Assistant Overview**

#### **1.1. Introduction**

This document gives an overview of the features of the Observability AI Assistant at the time of writing, and how to use them. At a high level, the Observability AI Assistant offers contextual insights, and a chat functionality that we enrich with function calling, allowing the LLM to hook into the user's data. We also allow the LLM to store things it considers new information as embeddings into Elasticsearch, and query this knowledge base when it decides it needs more information, using ELSER.

#### **1.1. Configuration**

Users can connect to an LLM using [connectors](https://www.elastic.co/guide/en/kibana/current/action-types.html) - specifically the [OpenAI connector](https://www.elastic.co/guide/en/kibana/current/openai-action-type.html), which currently supports both OpenAI and Azure OpenAI as providers. The connector is Enterprise-only. Users can also leverage [preconfigured connectors](https://www.elastic.co/guide/en/kibana/current/pre-configured-connectors.html), in which case the following should be added to `kibana.yml`:

```yaml
xpack.actions.preconfigured:
  open-ai:
    actionTypeId: .gen-ai
    name: OpenAI
    config:
      apiUrl: https://api.openai.com/v1/chat/completions
      apiProvider: OpenAI
    secrets:
      apiKey: <myApiKey>
  azure-open-ai:
    actionTypeId: .gen-ai
    name: Azure OpenAI
    config:
      apiUrl: https://<resourceName>.openai.azure.com/openai/deployments/<deploymentName>/chat/completions?api-version=<apiVersion>
      apiProvider: Azure OpenAI
    secrets:
      apiKey: <myApiKey>
```

**Note**: The configured deployed model should support [function calling](https://platform.openai.com/docs/guides/gpt/function-calling). For OpenAI, this is usually the case. For Azure, the minimum `apiVersion` is `2023-07-01-preview`. We also recommend a model with a pretty sizable token context length.

#### **1.2. Feature controls**

Access to the Observability AI Assistant and its APIs is managed through [Kibana privileges](https://www.elastic.co/guide/en/kibana/current/kibana-privileges.html).

The feature privilege is only available to those with an Enterprise licene.

#### **1.2. Access Points**

- **1.2.1. Contextual insights**

In several places in the Observability apps, the AI Assistant can generate content that helps users understand what they are looking at. We call these contextual insights. Some examples:

- In Profiling, the AI Assistant explains a displayed function and suggests optimisation opportunities
- In APM, it explains the meaning of a specific error or exception and offers common causes and possible impact
- In Alerting, the AI Assistant takes the results of the log spike analysis, and tries to find a root cause for the spike

The user can then also continue the conversation in a flyout by clicking "Start chat".

- **1.2.2. Action Menu Button**

All Observability apps also have a button in the top action menu, to open the AI Assistant and start a conversation.

- **1.2.3. Standalone page**

Users can also access existing conversations and create a new one by navigating to `/app/observabilityAIAssistant/conversations/new`. They can also find this link in the search bar.

#### **1.3. Chat**

Conversations with the AI Assistant are powered by three foundational components: the LLM (currently only OpenAI flavors), the knowledge base, and function calling.

The LLM essentially sits between the product and the user. Its purpose is to interpret both the messages from the user and the response from the functions called, and offer its conclusions and suggest next steps. It can suggest functions on its own, and it has read and write access to the knowledge base.

The knowledge base is an Elasticsearch index, with an inference processor powered by ELSER. Kibana developers can preload embeddings into this index, and users can access them too, via plain Elasticsearch APIs or specific Kibana APIs. Additionally, the LLM can query the knowledge base for additional context and store things it has learned from a conversation.

Both the user and the LLM are able to suggest functions, that are executed on behalf (and with the privileges of) the user. Functions allow both the user and the LLM to include relevant context into the conversation. This context can be text, data, or a visual component, like a timeseries graph. Some of the functions that are available are:

- `context` and `summarize`: these functions query (with a semantic search) or write to (with a summarisation) the knowledge database. This allows the LLM to create a (partly) user-specific working memory, and access predefined embeddings that help improve its understanding of the Elastic platform.
- `lens`: a function that can be used to create Lens vizualisations using Formulas.
- `get_apm_timeseries`, `get_apm_service_summary`, `get_apm_downstream_dependencies` and `get_apm_error_document`: a set of APM functions, some with visual components, that are helpful in performing root cause analysis.

Function calling is completely transparent to the user - they can edit function suggestions from the LLM, or inspect a function response (but not edit it), or they can request a function themselves.
