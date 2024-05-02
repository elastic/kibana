/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { screen, fireEvent, render, within, act, waitFor } from '@testing-library/react';
import type { Type as RuleType } from '@kbn/securitysolution-io-ts-alerting-types';
import { StepDefineRule, aggregatableFields } from '.';
import { mockBrowserFields } from '../../../../common/containers/source/mock';
import { useRuleFromTimeline } from '../../../../detections/containers/detection_engine/rules/use_rule_from_timeline';
import { TestProviders } from '../../../../common/mock';
import { schema as defineRuleSchema } from './schema';
import { stepDefineDefaultValue } from '../../../../detections/pages/detection_engine/rules/utils';
import type { FormSubmitHandler } from '../../../../shared_imports';
import { useForm } from '../../../../shared_imports';
import type { DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';
import { fleetIntegrationsApi } from '../../../fleet_integrations/api/__mocks__';

// Mocks integrations
jest.mock('../../../fleet_integrations/api');
jest.mock('../../../../common/components/query_bar', () => {
  return {
    QueryBar: jest.fn(({ filterQuery }) => {
      return <div data-test-subj="query-bar">{`${filterQuery.query} ${filterQuery.language}`}</div>;
    }),
  };
});

const mockRedirectLegacyUrl = jest.fn();
const mockGetLegacyUrlConflict = jest.fn();
jest.mock('../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...originalModule,
    useToasts: jest.fn().mockReturnValue({
      addError: jest.fn(),
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
      remove: jest.fn(),
    }),
    useKibana: () => ({
      services: {
        ...originalModule.useKibana().services,
        storage: {
          get: jest.fn().mockReturnValue(true),
        },
        application: {
          getUrlForApp: (appId: string, options?: { path?: string }) =>
            `/app/${appId}${options?.path}`,
          navigateToApp: jest.fn(),
          capabilities: {
            actions: {
              delete: true,
              save: true,
              show: true,
            },
          },
        },
        data: {
          dataViews: {
            getIdsWithTitle: async () =>
              Promise.resolve([{ id: 'myfakeid', title: 'hello*,world*,refreshed*' }]),
            create: async ({ title }: { title: string }) =>
              Promise.resolve({
                id: 'myfakeid',
                matchedIndices: ['hello', 'world', 'refreshed'],
                fields: [
                  {
                    name: 'bytes',
                    type: 'number',
                    esTypes: ['long'],
                    aggregatable: true,
                    searchable: true,
                    count: 10,
                    readFromDocValues: true,
                    scripted: false,
                    isMapped: true,
                  },
                  {
                    name: 'ssl',
                    type: 'boolean',
                    esTypes: ['boolean'],
                    aggregatable: true,
                    searchable: true,
                    count: 20,
                    readFromDocValues: true,
                    scripted: false,
                    isMapped: true,
                  },
                  {
                    name: '@timestamp',
                    type: 'date',
                    esTypes: ['date'],
                    aggregatable: true,
                    searchable: true,
                    count: 30,
                    readFromDocValues: true,
                    scripted: false,
                    isMapped: true,
                  },
                ],
                getIndexPattern: () => 'hello*,world*,refreshed*',
                getRuntimeMappings: () => ({
                  myfield: {
                    type: 'keyword',
                  },
                }),
              }),
            get: async (dataViewId: string, displayErrors?: boolean, refreshFields = false) =>
              Promise.resolve({
                id: dataViewId,
                matchedIndices: refreshFields
                  ? ['hello', 'world', 'refreshed']
                  : ['hello', 'world'],
                fields: [
                  {
                    name: 'bytes',
                    type: 'number',
                    esTypes: ['long'],
                    aggregatable: true,
                    searchable: true,
                    count: 10,
                    readFromDocValues: true,
                    scripted: false,
                    isMapped: true,
                  },
                  {
                    name: 'ssl',
                    type: 'boolean',
                    esTypes: ['boolean'],
                    aggregatable: true,
                    searchable: true,
                    count: 20,
                    readFromDocValues: true,
                    scripted: false,
                    isMapped: true,
                  },
                  {
                    name: '@timestamp',
                    type: 'date',
                    esTypes: ['date'],
                    aggregatable: true,
                    searchable: true,
                    count: 30,
                    readFromDocValues: true,
                    scripted: false,
                    isMapped: true,
                  },
                ],
                getIndexPattern: () => 'hello*,world*,refreshed*',
                getRuntimeMappings: () => ({
                  myfield: {
                    type: 'keyword',
                  },
                }),
              }),
          },
          search: {
            search: () => ({
              subscribe: () => ({
                unsubscribe: jest.fn(),
              }),
            }),
          },
        },
        spaces: {
          ui: {
            components: { getLegacyUrlConflict: mockGetLegacyUrlConflict },
            redirectLegacyUrl: mockRedirectLegacyUrl,
          },
        },
      },
    }),
  };
});
jest.mock('../../../../common/hooks/use_selector', () => {
  const actual = jest.requireActual('../../../../common/hooks/use_selector');
  return {
    ...actual,
    useDeepEqualSelector: () => ({
      kibanaDataViews: [{ id: 'world' }],
      sourcererScope: 'my-selected-dataview-id',
      selectedDataView: {
        id: 'security-solution',
        browserFields: mockBrowserFields,
        patternList: [],
      },
    }),
  };
});
jest.mock('../../../../common/components/link_to', () => {
  const originalModule = jest.requireActual('../../../../common/components/link_to');
  return {
    ...originalModule,
    getTimelineUrl: jest.fn(),
    useFormatUrl: jest.fn().mockReturnValue({
      formatUrl: jest.fn().mockImplementation((path: string) => path),
    }),
  };
});
jest.mock('../../../../common/containers/sourcerer', () => {
  const actual = jest.requireActual('../../../../common/containers/sourcerer');
  return {
    ...actual,
    useSourcererDataView: jest
      .fn()
      .mockReturnValue({ indexPattern: ['fakeindex'], loading: false }),
  };
});
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '/alerts' }) };
});

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: jest.fn(),
  };
});

jest.mock('../../../../detections/containers/detection_engine/rules/use_rule_from_timeline');

test('aggregatableFields', function () {
  expect(
    aggregatableFields([
      {
        name: 'error.message',
        type: 'string',
        esTypes: ['text'],
        searchable: true,
        aggregatable: false,
        readFromDocValues: false,
      },
    ])
  ).toEqual([]);
});

test('aggregatableFields with aggregatable: true', function () {
  expect(
    aggregatableFields([
      {
        name: 'error.message',
        type: 'string',
        esTypes: ['text'],
        searchable: true,
        aggregatable: false,
        readFromDocValues: false,
      },
      {
        name: 'file.path',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: false,
      },
    ])
  ).toEqual([
    {
      name: 'file.path',
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: false,
    },
  ]);
});

const mockUseRuleFromTimeline = useRuleFromTimeline as jest.Mock;
const onOpenTimeline = jest.fn();

const COMBO_BOX_TOGGLE_BUTTON_TEST_ID = 'comboBoxToggleListButton';
const VERSION_INPUT_TEST_ID = 'relatedIntegrationVersionDependency';

describe('StepDefineRule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRuleFromTimeline.mockReturnValue({ onOpenTimeline, loading: false });
  });

  it('renders correctly', () => {
    render(<TestForm />, {
      wrapper: TestProviders,
    });

    expect(screen.getByTestId('stepDefineRule')).toBeDefined();
  });

  describe('related integrations', () => {
    beforeEach(() => {
      fleetIntegrationsApi.fetchAllIntegrations.mockResolvedValue({
        integrations: [
          {
            package_name: 'package-a',
            package_title: 'Package A',
            latest_package_version: '1.0.0',
            is_installed: false,
            is_enabled: false,
          },
        ],
      });
    });

    it('submits form without selected related integrations', async () => {
      const initialState = {
        index: ['test-index'],
        queryBar: {
          query: { query: '*:*', language: 'kuery' },
          filters: [],
          saved_id: null,
        },
      };
      const handleSubmit = jest.fn();

      render(<TestForm initialState={initialState} onSubmit={handleSubmit} />, {
        wrapper: TestProviders,
      });

      await submitForm();
      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.not.objectContaining({
          relatedIntegrations: expect.anything(),
        }),
        true
      );
    });

    it('submits saved early related integrations', async () => {
      const initialState = {
        index: ['test-index'],
        queryBar: {
          query: { query: '*:*', language: 'kuery' },
          filters: [],
          saved_id: null,
        },
        relatedIntegrations: [
          { package: 'package-a', version: '1.2.3' },
          { package: 'package-b', integration: 'integration-a', version: '3.2.1' },
        ],
      };
      const handleSubmit = jest.fn();

      render(<TestForm initialState={initialState} onSubmit={handleSubmit} />, {
        wrapper: TestProviders,
      });

      await submitForm();
      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedIntegrations: [
            { package: 'package-a', version: '1.2.3' },
            { package: 'package-b', integration: 'integration-a', version: '3.2.1' },
          ],
        }),
        true
      );
    });

    it('submits a selected related integration', async () => {
      const initialState = {
        index: ['test-index'],
        queryBar: {
          query: { query: '*:*', language: 'kuery' },
          filters: [],
          saved_id: null,
        },
        relatedIntegrations: undefined,
      };
      const handleSubmit = jest.fn();

      render(<TestForm initialState={initialState} onSubmit={handleSubmit} />, {
        wrapper: TestProviders,
      });

      await addRelatedIntegrationRow();
      await selectEuiComboBoxOption({
        comboBoxToggleButton: within(screen.getByTestId('relatedIntegrations')).getByTestId(
          COMBO_BOX_TOGGLE_BUTTON_TEST_ID
        ),
        optionIndex: 0,
      });
      await setVersion({ input: screen.getByTestId(VERSION_INPUT_TEST_ID), value: '1.2.3' });

      await submitForm();
      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedIntegrations: [{ package: 'package-a', version: '1.2.3' }],
        }),
        true
      );
    });
  });

  describe('handleSetRuleFromTimeline', () => {
    it('updates KQL query correctly', () => {
      const kqlQuery = {
        index: ['.alerts-security.alerts-default', 'logs-*', 'packetbeat-*'],
        queryBar: {
          filters: [],
          query: {
            query: 'host.name:*',
            language: 'kuery',
          },
          saved_id: null,
        },
      };

      mockUseRuleFromTimeline.mockImplementation((handleSetRuleFromTimeline) => {
        useEffect(() => {
          handleSetRuleFromTimeline(kqlQuery);
        }, [handleSetRuleFromTimeline]);

        return { onOpenTimeline, loading: false };
      });

      render(<TestForm />, {
        wrapper: TestProviders,
      });

      expect(screen.getAllByTestId('query-bar')[0].textContent).toBe(
        `${kqlQuery.queryBar.query.query} ${kqlQuery.queryBar.query.language}`
      );
    });

    it('updates EQL query correctly', async () => {
      const eqlQuery = {
        index: ['.alerts-security.alerts-default', 'logs-*', 'packetbeat-*'],
        queryBar: {
          filters: [],
          query: {
            query: 'process where true',
            language: 'eql',
          },
          saved_id: null,
        },
        eqlOptions: {
          eventCategoryField: 'cool.field',
          tiebreakerField: 'another.field',
          timestampField: 'cool.@timestamp',
          query: 'process where true',
          size: 77,
        },
      };

      mockUseRuleFromTimeline.mockImplementation((handleSetRuleFromTimeline) => {
        useEffect(() => {
          handleSetRuleFromTimeline(eqlQuery);
        }, [handleSetRuleFromTimeline]);

        return { onOpenTimeline, loading: false };
      });

      render(<TestForm ruleType="eql" />, {
        wrapper: TestProviders,
      });

      expect(screen.getByTestId(`eqlQueryBarTextInput`).textContent).toEqual(
        eqlQuery.queryBar.query.query
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('eql-settings-trigger'));
      });

      expect(
        within(screen.getByTestId('eql-event-category-field')).queryByRole('combobox')
      ).toHaveValue(eqlQuery.eqlOptions.eventCategoryField);

      expect(
        within(screen.getByTestId('eql-tiebreaker-field')).queryByRole('combobox')
      ).toHaveValue(eqlQuery.eqlOptions.tiebreakerField);

      expect(within(screen.getByTestId('eql-timestamp-field')).queryByRole('combobox')).toHaveValue(
        eqlQuery.eqlOptions.timestampField
      );
    });
  });
});

interface TestFormProps {
  ruleType?: RuleType;
  initialState?: Partial<DefineStepRule>;
  onSubmit?: FormSubmitHandler<DefineStepRule>;
}

function TestForm({
  ruleType = stepDefineDefaultValue.ruleType,
  initialState,
  onSubmit,
}: TestFormProps): JSX.Element {
  const [selectedEqlOptions, setSelectedEqlOptions] = useState(stepDefineDefaultValue.eqlOptions);
  const { form } = useForm({
    options: { stripEmptyFields: false },
    schema: defineRuleSchema,
    defaultValue: { ...stepDefineDefaultValue, ...initialState },
    onSubmit,
  });

  return (
    <>
      <StepDefineRule
        isLoading={false}
        form={form}
        indicesConfig={[]}
        threatIndicesConfig={[]}
        optionsSelected={selectedEqlOptions}
        setOptionsSelected={setSelectedEqlOptions}
        indexPattern={{ fields: [], title: '' }}
        isIndexPatternLoading={false}
        browserFields={{}}
        isQueryBarValid={true}
        setIsQueryBarValid={jest.fn()}
        setIsThreatQueryBarValid={jest.fn()}
        ruleType={ruleType}
        index={stepDefineDefaultValue.index}
        threatIndex={stepDefineDefaultValue.threatIndex}
        groupByFields={stepDefineDefaultValue.groupByFields}
        dataSourceType={stepDefineDefaultValue.dataSourceType}
        shouldLoadQueryDynamically={stepDefineDefaultValue.shouldLoadQueryDynamically}
        queryBarTitle=""
        queryBarSavedId=""
        thresholdFields={[]}
        enableThresholdSuppression={false}
      />
      <button type="button" onClick={form.submit}>
        {'Submit'}
      </button>
    </>
  );
}

function submitForm(): Promise<void> {
  return act(async () => {
    fireEvent.click(screen.getByText('Submit'));
  });
}

function addRelatedIntegrationRow(): Promise<void> {
  return act(async () => {
    fireEvent.click(screen.getByText('Add integration'));
  });
}

function showEuiComboBoxOptions(comboBoxToggleButton: HTMLElement): Promise<void> {
  fireEvent.click(comboBoxToggleButton);

  return waitFor(() => {
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
}

function selectEuiComboBoxOption({
  comboBoxToggleButton,
  optionIndex,
}: {
  comboBoxToggleButton: HTMLElement;
  optionIndex: number;
}): Promise<void> {
  return act(async () => {
    await showEuiComboBoxOptions(comboBoxToggleButton);

    fireEvent.click(within(screen.getByRole('listbox')).getAllByRole('option')[optionIndex]);
  });
}

function setVersion({ input, value }: { input: HTMLInputElement; value: string }): Promise<void> {
  return act(async () => {
    fireEvent.input(input, {
      target: { value },
    });
  });
}
