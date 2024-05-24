type EcsMappingTableItem = {
  sourceField: string;
  destinationField: string;
  isEcs: boolean;
  description: string;
  id: string;
  exampleValue: any;
};

interface EcsMappingFormState {
  packageName: string;
  packageTitle: string;
  packageVersion: string;
  dataStreamName: string;
  dataStreamTitle: string;
  logFormat: string;
  inputTypes: string[];
  formSamples: string[];
  sampleCount: number;
  uniqueKeysCount: number;
  addFormSamples: (samples: string[]) => void;
  setSampleCount: (value: number) => void;
  setUniqueKeysCount: (value: number) => void;
  setEcsMappingFormValue: (key: string, value: string) => void;
  setEcsMappingFormArrayValue: (key: string, value: string[]) => void;
  resetEcsMappingFormState: () => void;
}

interface EcsMappingTableState {
  ecsMappingTableState: EcsMappingTableItem[];
  ecsMappingTablePopoverState: {};
  ecsMappingTableItemsWithEcs: number;
  setEcsMappingTableItemsWithEcs: (value: number) => void;
  setEcsMappingTablePopoverState: (identifier: string) => void;
  setEcsMappingTableState: (value: EcsMappingTableItem[]) => void;
  updateEcsMappingTableItem: (id: string, newDestinationField: string) => void;
  resetEcsMappingTableState: () => void;
}

interface IntegrationBuilderStepsState {
  integrationBuilderStep1: string;
  integrationBuilderStep2: string;
  integrationBuilderStep3: string;
  integrationBuilderStep4: string;
  integrationBuilderStep5: string;
  setIntegrationBuilderStepsState: (key: string, value: string) => void;
  resetIntegrationBuilderStepsState: () => void;
}

interface IntegrationBuilderContinueState {
  ecsButtonContinue: boolean,
  relatedButtonContinue: boolean,
  categorizationButtonContinue: boolean,
  setContinueButtonState: (key: string, value: boolean) => void;
  resetContinueButtonState: () => void;
}

interface IntegrationBuilderIsLoadingState {
  relatedIsLoading: boolean,
  ecsMappingIsLoading: boolean,
  categorizationIsLoading: boolean,
  setIsLoadingState: (key: string, value: boolean) => void;
  resetIsLoadingState: () => void;
}

interface IntegrationBuilderChainItemsState {
  ingestPipeline: object;
  docs: Array<object>;
  mapping: object;
  integrationBuilderZipFile: File | null;
  setIntegrationBuilderZipFile: (file: File) => void;
  setIntegrationBuilderChainItemsState: (key: string, value: object) => void;
  updateChainItem: (path: string, newValue: object, itemType: string) => void;
  resetChainItemsState: () => void;
}

interface IntegrationBuilderHeaderState {
  integrationBuilderHeaderTitle: string;
  isPortalLoading: boolean;
  setIsPortalLoadingState: (value: boolean) => void;
  setIntegrationBuilderHeaderTitle: (value: string) => void;
  resetIntegrationBuilderHeaderState: () => void;
}