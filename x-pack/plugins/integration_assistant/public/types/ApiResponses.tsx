type CategorizationApiResponse = {
  results: {
    pipeline: object;
    docs: Array<object>;
  };
};

type RelatedApiResponse = {
  results: {
    pipeline: object;
    docs: Array<object>;
  };
};

type EcsMappingApiResponse = {
  results: {
    mapping: object;
    current_pipeline: object;
  };
};