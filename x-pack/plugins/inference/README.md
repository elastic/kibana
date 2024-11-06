# Inference plugin

The inference plugin is a central place to handle all interactions with the Elasticsearch Inference API and
external LLM APIs. Its goals are:

- Provide a single place for all interactions with large language models and other generative AI adjacent tasks.
- Abstract away differences between different LLM providers like OpenAI, Bedrock and Gemini
- Host commonly used LLM-based tasks like generating ES|QL from natural language and knowledge base recall.
- Allow us to move gradually to the \_inference endpoint without disrupting engineers.

## Architecture and examples

![CleanShot 2024-07-14 at 14 45 27@2x](https://github.com/user-attachments/assets/e65a3e47-bce1-4dcf-bbed-4f8ac12a104f)

## Terminology

The following concepts are commonly used throughout the plugin:

- **chat completion**: the process in which the LLM generates the next message in the conversation. This is sometimes referred to as inference, text completion, text generation or content generation.
- **tasks**: higher level tasks that, based on its input, use the LLM in conjunction with other services like Elasticsearch to achieve a result. The example in this POC is natural language to ES|QL.
- **tools**: a set of tools that the LLM can choose to use when generating the next message. In essence, it allows the consumer of the API to define a schema for structured output instead of plain text, and having the LLM select the most appropriate one.
- **tool call**: when the LLM has chosen a tool (schema) to use for its output, and returns a document that matches the schema, this is referred to as a tool call.

## Usage examples

```ts
class MyPlugin {
  setup(coreSetup, pluginsSetup) {
    const router = coreSetup.http.createRouter();

    router.post(
      {
        path: '/internal/my_plugin/do_something',
        validate: {
          body: schema.object({
            connectorId: schema.string(),
          }),
        },
      },
      async (context, request, response) => {
        const [coreStart, pluginsStart] = await coreSetup.getStartServices();

        const inferenceClient = pluginsSetup.inference.getClient({ request });

        const chatComplete$ = inferenceClient.chatComplete({
          connectorId: request.body.connectorId,
          system: `Here is my system message`,
          messages: [
            {
              role: MessageRole.User,
              content: 'Do something',
            },
          ],
        });

        const message = await lastValueFrom(
          chatComplete$.pipe(withoutTokenCountEvents(), withoutChunkEvents())
        );

        return response.ok({
          body: {
            message,
          },
        });
      }
    );
  }
}
```

## Services

### `chatComplete`:

`chatComplete` generates a response to a prompt or a conversation using the LLM. Here's what is supported:

- Normalizing request and response formats from different connector types (e.g. OpenAI, Bedrock, Claude, Elastic Inference Service)
- Tool calling and validation of tool calls
- Emits token count events
- Emits message events, which is the concatenated message based on the response chunks

### `output`

`output` is a wrapper around `chatComplete` that is catered towards a single use case: having the LLM output a structured response, based on a schema. It also drops the token count events to simplify usage.

### Observable event streams

These APIs, both on the client and the server, return Observables that emit events. When converting the Observable into a stream, the following things happen:

- Errors are caught and serialized as events sent over the stream (after an error, the stream ends).
- The response stream outputs data as [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- The client that reads the stream, parses the event source as an Observable, and if it encounters a serialized error, it deserializes it and throws an error in the Observable.

### Errors

All known errors are instances, and not extensions, from the `InferenceTaskError` base class, which has a `code`, a `message`, and `meta` information about the error. This allows us to serialize and deserialize errors over the wire without a complicated factory pattern.

### Tools

Tools are defined as a record, with a `description` and optionally a `schema`. The reason why it's a record is because of type-safety. This allows us to have fully typed tool calls (e.g. when the name of the tool being called is `x`, its arguments are typed as the schema of `x`).
