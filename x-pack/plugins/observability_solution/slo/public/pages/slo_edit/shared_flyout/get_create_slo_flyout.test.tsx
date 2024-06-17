/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// import { coreMock } from '@kbn/core/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { createObservabilityRuleTypeRegistryMock } from '@kbn/observability-plugin/public/rules/observability_rule_type_registry_mock';
import { act, render, screen } from '@testing-library/react';
import { getCreateSLOFlyoutLazy } from './get_create_slo_flyout';
import { sloPublicPluginsStartMock } from '../../../plugin.mock';
import { useFetchDataViews, useCreateRule } from '@kbn/observability-plugin/public';
import { useFetchIndices } from '../../../hooks/use_fetch_indices';
import { useFetchApmSuggestions } from '../../../hooks/use_fetch_apm_suggestions';
import { useFetchSloDetails } from '../../../hooks/use_fetch_slo_details';
import { useCreateSlo } from '../../../hooks/use_create_slo';
import { useUpdateSlo } from '../../../hooks/use_update_slo';
import { useCapabilities } from '../../../hooks/use_capabilities';
import { useFetchApmIndex } from '../../../hooks/use_fetch_apm_indices';
import { useKibana } from '../../../utils/kibana_react';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';
import { BehaviorSubject } from 'rxjs';
import { useFetchSloGlobalDiagnosis } from '../../../hooks/use_fetch_global_diagnosis';
import { cleanup } from '@testing-library/react';

jest.mock('@kbn/observability-shared-plugin/public');
jest.mock('@kbn/observability-plugin/public');
jest.mock('../../../hooks/use_fetch_indices');
jest.mock('../../../hooks/use_fetch_slo_details');
jest.mock('../../../hooks/use_create_slo');
jest.mock('../../../hooks/use_update_slo');
jest.mock('../../../hooks/use_fetch_apm_suggestions');
jest.mock('../../../hooks/use_capabilities');
jest.mock('../../../hooks/use_fetch_apm_indices');
jest.mock('../../../hooks/use_fetch_global_diagnosis');

// const mockUseKibanaReturnValue = kibanaStartMock.startContract();

// jest.mock('../../../utils/kibana_react', () => ({
//   useKibana: jest.fn(() => mockUseKibanaReturnValue),
// }));

// const useKibanaMock = useKibana as jest.Mock;

const useFetchIndicesMock = useFetchIndices as jest.Mock;
const useFetchDataViewsMock = useFetchDataViews as jest.Mock;
const useFetchSloMock = useFetchSloDetails as jest.Mock;
const useCreateSloMock = useCreateSlo as jest.Mock;
const useUpdateSloMock = useUpdateSlo as jest.Mock;
const useCreateRuleMock = useCreateRule as jest.Mock;
const useFetchApmSuggestionsMock = useFetchApmSuggestions as jest.Mock;
const useCapabilitiesMock = useCapabilities as jest.Mock;
const useFetchApmIndexMock = useFetchApmIndex as jest.Mock;
const useFetchSloGlobalDiagnosisMock = useFetchSloGlobalDiagnosis as jest.Mock;

describe('render the flyout', () => {
  const mockCreateRule = jest.fn();
  const mockUpdate = jest.fn();
  const mockCreate = jest.fn(() => Promise.resolve({ id: 'mock-slo-id' }));

  beforeEach(() => {
    jest.clearAllMocks();

    // useKibanaMock.mockReturnValue({
    //   services: {
    //     theme: {},
    //     application: {
    //       navigateToUrl: jest.fn(),
    //     },
    //     charts: {
    //       theme: {
    //         useChartsBaseTheme: () => {},
    //       },
    //     },
    //     data: {
    //       dataViews: {
    //         find: jest.fn().mockReturnValue([]),
    //         get: jest.fn().mockReturnValue([]),
    //         getDefault: jest.fn(),
    //       },
    //     },
    //     dataViews: {
    //       create: jest.fn().mockResolvedValue({
    //         getIndexPattern: jest.fn().mockReturnValue('some-index'),
    //       }),
    //     },
    //     docLinks: {
    //       links: {
    //         query: {},
    //       },
    //     },
    //     http: {
    //       basePath: {
    //         prepend: jest.fn(),
    //       },
    //     },
    //     storage: {
    //       get: () => {},
    //     },
    //     triggersActionsUi: {
    //       getAddRuleFlyout: jest
    //         .fn()
    //         .mockReturnValue(<div data-test-subj="add-rule-flyout">Add Rule Flyout</div>),
    //     },
    //     uiSettings: {
    //       get: () => {},
    //     },
    //     unifiedSearch: {
    //       ui: {
    //         QueryStringInput: () => <div>Query String Input</div>,
    //         SearchBar: () => <div>Search Bar</div>,
    //       },
    //       autocomplete: {
    //         hasQuerySuggestions: () => {},
    //       },
    //     },
    //     licensing: {
    //       license$: new BehaviorSubject(null),
    //     },
    //   },
    // });

    useFetchDataViewsMock.mockReturnValue({
      isLoading: false,
      data: [{ getName: () => 'dataview', getIndexPattern: () => '.dataview-index' }],
    });
    useFetchIndicesMock.mockReturnValueOnce({
      isLoading: false,
      data: ['some-index', 'index-2'],
    });

    useCreateSloMock.mockReturnValue({
      isLoading: false,
      isSuccess: false,
      isError: false,
      mutateAsync: mockCreate,
    });

    useCreateRuleMock.mockReturnValue({
      isLoading: false,
      isSuccess: false,
      isError: false,
      mutateAsync: mockCreateRule,
    });

    useUpdateSloMock.mockReturnValue({
      isLoading: false,
      isSuccess: false,
      isError: false,
      mutateAsync: mockUpdate,
    });

    useFetchApmSuggestionsMock.mockReturnValue({
      suggestions: ['cartService'],
      isLoading: false,
    });
    useFetchSloMock.mockReturnValue({ isLoading: false, data: undefined });
    useCapabilitiesMock.mockReturnValue({
      hasWriteCapabilities: true,
      hasReadCapabilities: true,
    });

    useFetchApmIndexMock.mockReturnValue({
      isLoading: false,
      data: '',
    });

    useFetchSloGlobalDiagnosisMock.mockReturnValue({
      isError: false,
    });
  });

  afterEach(cleanup);

  it('renders the flyout', async () => {
    const coreSetup = coreMock.createSetup();
    const [coreStartMock] = await coreSetup.getStartServices();
    const Flyout = getCreateSLOFlyoutLazy({
      core: coreMock.createStart(),
      plugins: {
        ...coreStartMock,
        ...sloPublicPluginsStartMock.createStart(),
      },
      observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
      isDev: false,
      kibanaVersion: '8.0.0',
      isServerless: false,
      experimentalFeatures: undefined,
    });

    await act(async () => {
      render(<Flyout onClose={() => {}} />);
    });

    expect(await screen.findByTestId('addSLOFlyoutTitle')).toBeTruthy();
  });
});
