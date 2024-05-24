interface BuildIntegrationAPIRequest {
  packageName: string;
  packageTitle: string;
  packageVersion: string;
  dataStreamName: string;
  inputTypes: string[];
  formSamples: string[];
  ingestPipeline: object;
  docs: Array<object>;
}

interface EcsMappingAPIRequest {
  packageName: string;
  dataStreamName: string;
  formSamples: string[];
}

interface EcsMappingNewPipelineAPIRequest {
  packageName: string;
  dataStreamName: string;
  formSamples: string[];
  mapping: object;
}

interface CategorizationAPIRequest {
  packageName: string;
  dataStreamName: string;
  formSamples: string[];
  ingestPipeline: object;
}

interface RelatedAPIRequest {
  packageName: string;
  dataStreamName: string;
  formSamples: string[];
  ingestPipeline: object;
}