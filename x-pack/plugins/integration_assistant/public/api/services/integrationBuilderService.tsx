import { apiPostWithFileResponse, apiPost } from '@Api/services/apiRequest';

export async function buildIntegration(req: BuildIntegrationAPIRequest) {
  const requestBody = {
    package_name: req.packageName,
    title: req.packageTitle,
    description: 'test description',
    data_stream: [
      {
        name: req.dataStreamName,
        type: req.inputTypes,
        title: 'Test data stream title',
        description: 'Test data stream description',
        format: 'json',
        samples: req.formSamples,
        pipeline: req.ingestPipeline,
        docs: req.docs,
      },
    ],
  };

  const response = apiPostWithFileResponse(
    'integration_builder/package',
    JSON.stringify(requestBody),
    `${req.packageName}-${req.packageVersion}.zip`,
  );
  return response;
}

export async function installIntegration(file: File) {
  const path = 'api/fleet/epm/packages';

  const response = apiPost(path, file);
  return response;
}
