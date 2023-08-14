import { SavedObjectsClientContract } from '@kbn/core/server';
import type { APMDataAccessConfig, APMIndices } from '@kbn/apm-data-access-plugin/server';
import { getApmIndicesSavedObject } from '../saved_objects/apm_indices';

export async function getApmIndicesFromSavedObjectsAndConfigFile({
  apmIndicesFromConfigFile,
  savedObjectsClient,
}: {
  apmIndicesFromConfigFile: APMDataAccessConfig['indices'];
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<APMIndices> {
  try {
    const apmIndicesSavedObject = await getApmIndicesSavedObject(savedObjectsClient);
    return { ...apmIndicesFromConfigFile, ...apmIndicesSavedObject };
  } catch (error) {
    return apmIndicesFromConfigFile;
  }
}
