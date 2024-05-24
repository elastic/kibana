import { newRunnable } from '@api/services/runnableClient';

export async function getRelated(req: RelatedAPIRequest) {
  const client = newRunnable('related');
  let response = { results: { pipeline: {}, docs: [] } } as RelatedApiResponse;
  try {
    response = (await client.invoke({
      package_name: req.packageName,
      data_stream_name: req.dataStreamName,
      raw_samples: req.formSamples,
      current_pipeline: req.ingestPipeline,
    })) as RelatedApiResponse;
  } catch (e) {
    console.error(e);
    return response;
  }

  return response;
}
