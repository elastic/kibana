import { newRunnable } from '@Api/services/runnableClient';
import { mergeDeeply, traverseAndMatchFields } from '@Utils/samples';

export function formatEcsResponse(
  response: EcsMappingApiResponse,
  packageName: string,
  dataStreamName: string,
  rawSamples: string[],
): EcsMappingTableItem[] {
  const rawObjects = rawSamples.map((str) => JSON.parse(str));
  const mergedObject = mergeDeeply(rawObjects);
  const matches = traverseAndMatchFields(
    response.results.mapping[packageName][dataStreamName],
    mergedObject,
    packageName,
    dataStreamName,
  );
  // Sorting the matches by isEcs then alphabetically on sourceField:
  matches.sort((a, b) => {
    // First, sort by `isEcs` status, true first
    if (a.isEcs && !b.isEcs) return -1;
    if (!a.isEcs && b.isEcs) return 1;

    // Then, if `isEcs` status is the same, sort alphabetically by `source_field`
    return a.sourceField.localeCompare(b.sourceField);
  });

  return matches;
}

export async function getEcsMapping(req: EcsMappingAPIRequest) {
  let response = { results: { mapping: {}, current_pipeline: {} } } as EcsMappingApiResponse;
  const client = newRunnable('ecs');
  try {
    response = (await client.invoke({
      package_name: req.packageName,
      data_stream_name: req.dataStreamName,
      raw_samples: req.formSamples,
    })) as EcsMappingApiResponse;
  } catch (e) {
    console.error(e);
    return response;
  }
  return response;
}

export async function getUpdatedPipeline(req: EcsMappingNewPipelineAPIRequest) {
  const client = newRunnable('ecs');
  let response = { results: { mapping: {}, current_pipeline: {} } } as EcsMappingApiResponse;
  try {
    response = (await client.invoke({
      package_name: req.packageName,
      data_stream_name: req.dataStreamName,
      raw_samples: req.formSamples,
      current_mapping: req.mapping,
    })) as EcsMappingApiResponse;
  } catch (e) {
    console.error(e);
    return response;
  }
  return response;
}
