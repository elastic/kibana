import { SavedObjectsClientContract } from 'kibana/server';
import { apmConfigMapping } from './create_cloud_apm_package_policy';

export async function getUnsupportedApmServerSchema({
  savedObjectsClient,
}: {
  savedObjectsClient: SavedObjectsClientContract;
}) {
  const { attributes } = await savedObjectsClient.get(
    'apm-server-settings',
    'apm-server-settings'
  );
  const apmServerSchema: Record<string, any> = JSON.parse(
    (attributes as { schemaJson: string }).schemaJson
  );
  return Object.entries(apmServerSchema)
    .filter(([name]) => !(name in apmConfigMapping))
    .map(([key, value]) => ({ key, value }));
}
