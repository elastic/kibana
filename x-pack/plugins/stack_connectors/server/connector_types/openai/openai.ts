async completionWithRetry(completionRequest) {
  const requestBody = this.formatRequestForActionsClient(completionRequest);
  const actionResult = await this.#actionsClient.execute(requestBody);
  this.#logger.debug(`Action Result: ${JSON.stringify(actionResult)}`);

  if (actionResult.status === 'error') {
    throw new Error(`${LLM_TYPE}: ${actionResult?.message} - ${actionResult?.serviceMessage}`);
  }

  if (actionResult.data?.object === 'chat.completion') {
    const chatCompletion = get('data', actionResult) as OpenAI.ChatCompletion;
    this.#logger.debug(`Non-Streaming ChatCompletion: ${JSON.stringify(chatCompletion)}`);
    return chatCompletion;
  }

  const result = get('data', actionResult) as { consumerStream: Stream<OpenAI.ChatCompletionChunk> };
  if (result.consumerStream == null) {
    throw new Error(`${LLM_TYPE}: action result data is empty ${JSON.stringify(actionResult)}`);
  }
  return result.consumerStream;
}
