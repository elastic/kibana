import { RouteDependencies } from '../../plugin';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';
import Assist, { ConversationalChain } from '@elastic/ai-assist';
import { ChatOpenAI } from '@elastic/ai-assist/models';
import { Prompt } from '@elastic/ai-assist';
import { schema } from '@kbn/config-schema';
import Stream from 'stream';

export function registerAIPlaygroundRoutes({ log, router }: RouteDependencies) {
  router.post(
    {
      path: '/internal/enterprise_search/ai_playground/chat',
      validate: {
        body: schema.object({
          data: schema.any(),
          messages: schema.any(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      const aiClient = Assist({
        es_client: client.asCurrentUser,
      });

      const { messages, data } = await request.body;

      const model = new ChatOpenAI({
        openAIApiKey: data.api_key,
      });

      const chain = ConversationalChain({
        model,
        rag: {
          index: data.indices,
          retriever: (question: string) => {
            return {
              text_expansion: {
                'vector.tokens': {
                  model_id: '.elser_model_2',
                  model_text: question,
                },
              },
            };
          },
        },
        prompt: Prompt(data.prompt, {
          citations: data.citations,
          context: true,
          type: 'openai',
        }),
      });

      const stream = await chain.stream(aiClient, messages);

      const reader = (stream as ReadableStream).getReader();

      class UIStream extends Stream.Readable {
        _read() {
          const that = this;

          function read() {
            reader.read().then(({ done, value }: { done: boolean; value?: string }) => {
              if (done) {
                that.push(null);
                return;
              }
              that.push(value);
              read();
            });
          }
          read();
        }
      }

      return response.custom({
        body: new UIStream(),
        statusCode: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    })
  );
}
