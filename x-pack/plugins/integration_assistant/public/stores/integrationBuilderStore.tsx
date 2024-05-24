import { StateCreator } from 'zustand';
import { mergeDeeply } from '@Utils/samples';

const initialIntegrationBuilderStepsState = {
  integrationBuilderStep1: 'current',
  integrationBuilderStep2: 'incomplete',
  integrationBuilderStep3: 'incomplete',
  integrationBuilderStep4: 'incomplete',
  integrationBuilderStep5: 'incomplete',
};

export const integrationBuilderStepsState: StateCreator<
  IntegrationBuilderStepsState,
  [['zustand/devtools', never]],
  [],
  IntegrationBuilderStepsState
> = (set): IntegrationBuilderStepsState => ({
  ...initialIntegrationBuilderStepsState,
  setIntegrationBuilderStepsState: (key, value) => set(() => ({ [key]: value })),
  resetIntegrationBuilderStepsState: () => set(() => ({ ...initialIntegrationBuilderStepsState })),
});

const initialEcsMappingFormState = {
  packageName: '',
  packageTitle: '',
  packageVersion: '0.1.0',
  dataStreamName: '',
  dataStreamTitle: '',
  logFormat: 'json',
  inputTypes: [],
  formSamples: [],
  sampleCount: 0,
  uniqueKeysCount: 0,
};

export const ecsMappingFormState: StateCreator<
  EcsMappingFormState,
  [['zustand/devtools', never]],
  [],
  EcsMappingFormState
> = (set): EcsMappingFormState => ({
  ...initialEcsMappingFormState,
  addFormSamples: (value) =>
    set((state) => {
      // New formSamples after adding the new valid samples
      const newFormSamples = [...state.formSamples, ...value];

      // Calculate sampleCount as the length of newFormSamples
      const newSampleCount = newFormSamples.length;
      const rawObjects = newFormSamples.map((line) => JSON.parse(line));
      // Calculate uniqueKeysCount by merging all objects and counting the keys
      const mergedObject = mergeDeeply(rawObjects);
      const newUniqueKeysCount = Object.keys(mergedObject).length;

      return {
        formSamples: newFormSamples,
        sampleCount: newSampleCount,
        uniqueKeysCount: newUniqueKeysCount,
      };
    }),
  setSampleCount: (value) => set(() => ({ sampleCount: value })),
  setUniqueKeysCount: (value) => set(() => ({ uniqueKeysCount: value })),
  setEcsMappingFormValue: (key, value) => set(() => ({ [key]: value })),
  setEcsMappingFormArrayValue: (key, value) => set(() => ({ [key]: value })),
  resetEcsMappingFormState: () => set(() => ({ ...initialEcsMappingFormState })),
});

const initialIntegrationBuilderChainItemsState = {
  mapping: {},
  ingestPipeline: {},
  docs: [],
  integrationBuilderZipFile: null,
};

export const integrationBuilderChainItemsState: StateCreator<
  IntegrationBuilderChainItemsState,
  [['zustand/devtools', never]],
  [],
  IntegrationBuilderChainItemsState
> = (set): IntegrationBuilderChainItemsState => ({
  ...initialIntegrationBuilderChainItemsState,
  setIntegrationBuilderZipFile: (file) => set(() => ({ integrationBuilderZipFile: file })),
  setIntegrationBuilderChainItemsState(key, value) {
    set(() => ({ [key]: value }));
  },
  updateChainItem: (path, newValue, itemType) =>
    set((state) => {
      const keys = path.split('.');
      const lastKey = keys.pop();
      const lastObj = keys.reduce((acc, key) => (acc[key] = acc[key] || {}), state[itemType]);
      if (lastKey) {
        lastObj[lastKey] = newValue;
      }
      return { [itemType]: { ...state[itemType] } };
    }),
  resetChainItemsState: () => set(() => ({ ...initialIntegrationBuilderChainItemsState })),
});

const initialEcsMappingTableState = {
  ecsMappingTablePopoverState: {},
  ecsMappingTableState: [],
  ecsMappingTableItemsWithEcs: 0,
};

export const ecsMappingTableState: StateCreator<
  EcsMappingTableState,
  [['zustand/devtools', never]],
  [],
  EcsMappingTableState
> = (set): EcsMappingTableState => ({
  ...initialEcsMappingTableState,
  setEcsMappingTableItemsWithEcs: (value) => set(() => ({ ecsMappingTableItemsWithEcs: value })),
  setEcsMappingTablePopoverState: (identifier) =>
    set((state) => ({
      ecsMappingTablePopoverState: {
        ...state.ecsMappingTablePopoverState,
        [identifier]: !state.ecsMappingTablePopoverState[identifier],
      },
    })),
  setEcsMappingTableState: (value) => set(() => ({ ecsMappingTableState: value })),
  updateEcsMappingTableItem: (id, newDestinationField) =>
    set((state) => {
      const updatedTableState = state.ecsMappingTableState.map((item) => {
        if (item.id === id) {
          return { ...item, destinationField: newDestinationField };
        }
        return item;
      });

      return { ecsMappingTableState: updatedTableState };
    }),
  resetEcsMappingTableState: () => set(() => ({ ...initialEcsMappingTableState })),
});

const initialIntegrationBuilderContinueState = {
  ecsButtonContinue: false,
  categorizationButtonContinue: false,
  relatedButtonContinue: false,
};

export const integrationBuilderContinueState: StateCreator<
  IntegrationBuilderContinueState,
  [['zustand/devtools', never]],
  [],
  IntegrationBuilderContinueState
> = (set): IntegrationBuilderContinueState => ({
  ...initialIntegrationBuilderContinueState,
  setContinueButtonState: (key, value) => set(() => ({ [key]: value })),
  resetContinueButtonState: () => set(() => ({ ...initialIntegrationBuilderContinueState })),
});

const initialIntegrationBuilderIsLoadingState = {
  relatedIsLoading: false,
  categorizationIsLoading: false,
  ecsMappingIsLoading: false,
};

export const integrationBuilderIsLoadingState: StateCreator<
  IntegrationBuilderIsLoadingState,
  [['zustand/devtools', never]],
  [],
  IntegrationBuilderIsLoadingState
> = (set): IntegrationBuilderIsLoadingState => ({
  ...initialIntegrationBuilderIsLoadingState,
  setIsLoadingState: (key, value) => set(() => ({ [key]: value })),
  resetIsLoadingState: () => set(() => ({ ...initialIntegrationBuilderIsLoadingState })),
});

const initialIntegrationBuilderHeaderState = {
  isPortalLoading: false,
  integrationBuilderHeaderTitle: "",
};

export const integrationBuilderHeaderState: StateCreator<
  IntegrationBuilderHeaderState,
  [['zustand/devtools', never]],
  [],
  IntegrationBuilderHeaderState
> = (set): IntegrationBuilderHeaderState => ({
  ...initialIntegrationBuilderHeaderState,
  setIsPortalLoadingState: (value) => set(() => ({ isPortalLoading: value })),
  setIntegrationBuilderHeaderTitle: (value) => set(() => ({ integrationBuilderHeaderTitle: value })),
  resetIntegrationBuilderHeaderState: () => set(() => ({ ...initialIntegrationBuilderHeaderState })),
});