import { newRunnable } from '@api/services/runnableClient';

export async function getCategorization(req: CategorizationAPIRequest) {
  const client = newRunnable('categorization');
  let response = { results: { pipeline: {}, docs: [] } } as CategorizationApiResponse;
  try {
    response = (await client.invoke({
      package_name: req.packageName,
      data_stream_name: req.dataStreamName,
      raw_samples: req.formSamples,
      current_pipeline: req.ingestPipeline,
    })) as CategorizationApiResponse;
  } catch (e) {
    console.error(e);
    return response;
  }

  return response;
}
