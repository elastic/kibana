import { BedrockChat } from '@langchain/community/chat_models/bedrock/web';

export function getModel(): BedrockChat {
  const model = new BedrockChat({
    model: 'anthropic.claude-3-opus-20240229-v1:0',
    region: 'us-west-2',
    temperature: 0.05,
    maxTokens: 4096,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    modelKwargs: {
      top_k: 200,
      top_p: 0.4,
      stop_sequences: ['Human:'],
    },
  });
  return model;
}
