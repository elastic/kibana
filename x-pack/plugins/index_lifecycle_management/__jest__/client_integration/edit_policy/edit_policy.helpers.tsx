/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { registerTestBed, TestBedConfig } from '@kbn/test/jest';

import { licensingMock } from '../../../../licensing/public/mocks';

import { EditPolicy } from '../../../public/application/sections/edit_policy';
import { DataTierAllocationType } from '../../../public/application/sections/edit_policy/types';

import { Phases as PolicyPhases } from '../../../common/types';

import { KibanaContextProvider } from '../../../public/shared_imports';
import { AppServicesContext } from '../../../public/types';
import { createBreadcrumbsMock } from '../../../public/application/services/breadcrumbs.mock';

import { TestSubjects } from '../helpers';
import { POLICY_NAME } from './constants';

type Phases = keyof PolicyPhases;

window.scrollTo = jest.fn();

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    // Mocking EuiComboBox, as it utilizes "react-virtualized" for rendering search suggestions,
    // which does not produce a valid component wrapper
    EuiComboBox: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockComboBox'}
        data-currentvalue={props.selectedOptions}
        onChange={async (syntheticEvent: any) => {
          props.onChange([syntheticEvent['0']]);
        }}
      />
    ),
    EuiIcon: 'eui-icon', // using custom react-svg icon causes issues, mocking for now.
  };
});

const getTestBedConfig = (testBedConfigArgs?: Partial<TestBedConfig>): TestBedConfig => {
  return {
    memoryRouter: {
      initialEntries: [`/policies/edit/${POLICY_NAME}`],
      componentRoutePath: `/policies/edit/:policyName`,
    },
    defaultProps: {
      getUrlForApp: () => {},
    },
    ...testBedConfigArgs,
  };
};

const breadcrumbService = createBreadcrumbsMock();

const MyComponent = ({ appServicesContext, ...rest }: any) => {
  return (
    <KibanaContextProvider
      services={{
        breadcrumbService,
        license: licensingMock.createLicense({ license: { type: 'enterprise' } }),
        ...appServicesContext,
      }}
    >
      <EditPolicy {...rest} />
    </KibanaContextProvider>
  );
};

const initTestBed = (arg?: {
  appServicesContext?: Partial<AppServicesContext>;
  testBedConfig?: Partial<TestBedConfig>;
}) => {
  const { testBedConfig: testBedConfigArgs, ...rest } = arg || {};
  return registerTestBed<TestSubjects>(MyComponent, getTestBedConfig(testBedConfigArgs))(rest);
};

type SetupReturn = ReturnType<typeof setup>;

export type EditPolicyTestBed = SetupReturn extends Promise<infer U> ? U : SetupReturn;

export const setup = async (arg?: {
  appServicesContext?: Partial<AppServicesContext>;
  testBedConfig?: Partial<TestBedConfig>;
}) => {
  const testBed = await initTestBed(arg);

  const { find, component, form, exists } = testBed;

  const createFormToggleAction = (dataTestSubject: string) => async (checked: boolean) => {
    await act(async () => {
      form.toggleEuiSwitch(dataTestSubject, checked);
    });
    component.update();
  };

  const createFormCheckboxAction = (dataTestSubject: string) => async (checked: boolean) => {
    await act(async () => {
      form.selectCheckBox(dataTestSubject, checked);
    });
    component.update();
  };

  function createFormSetValueAction<V extends string = string>(dataTestSubject: string) {
    return async (value: V) => {
      await act(async () => {
        form.setInputValue(dataTestSubject, value);
      });
      component.update();
    };
  }

  const setWaitForSnapshotPolicy = async (snapshotPolicyName: string) => {
    act(() => {
      find('snapshotPolicyCombobox').simulate('change', [{ label: snapshotPolicyName }]);
    });
    component.update();
  };

  const savePolicy = async () => {
    await act(async () => {
      find('savePolicyButton').simulate('click');
    });
    component.update();
  };

  const toggleDefaultRollover = createFormToggleAction('useDefaultRolloverSwitch');

  const toggleRollover = createFormToggleAction('rolloverSwitch');

  const setMaxSize = async (value: string, units?: string) => {
    await act(async () => {
      find('hot-selectedMaxSizeStored').simulate('change', { target: { value } });
      if (units) {
        find('hot-selectedMaxSizeStoredUnits.select').simulate('change', {
          target: { value: units },
        });
      }
    });
    component.update();
  };

  const setMaxDocs = createFormSetValueAction('hot-selectedMaxDocuments');

  const setMaxAge = async (value: string, units?: string) => {
    await act(async () => {
      find('hot-selectedMaxAge').simulate('change', { target: { value } });
      if (units) {
        find('hot-selectedMaxAgeUnits.select').simulate('change', { target: { value: units } });
      }
    });
    component.update();
  };

  const createForceMergeActions = (phase: Phases) => {
    const toggleSelector = `${phase}-forceMergeSwitch`;
    return {
      forceMergeFieldExists: () => exists(toggleSelector),
      toggleForceMerge: createFormToggleAction(toggleSelector),
      setForcemergeSegmentsCount: createFormSetValueAction(`${phase}-selectedForceMergeSegments`),
      setBestCompression: createFormCheckboxAction(`${phase}-bestCompression`),
    };
  };

  const createIndexPriorityActions = (phase: Phases) => {
    const toggleSelector = `${phase}-indexPrioritySwitch`;
    return {
      indexPriorityExists: () => exists(toggleSelector),
      toggleIndexPriority: createFormToggleAction(toggleSelector),
      setIndexPriority: createFormSetValueAction(`${phase}-indexPriority`),
    };
  };

  const enable = (phase: Phases) => createFormToggleAction(`enablePhaseSwitch-${phase}`);

  const createMinAgeActions = (phase: Phases) => {
    return {
      hasMinAgeInput: () => exists(`${phase}-selectedMinimumAge`),
      setMinAgeValue: createFormSetValueAction(`${phase}-selectedMinimumAge`),
      setMinAgeUnits: createFormSetValueAction(`${phase}-selectedMinimumAgeUnits`),
      hasRolloverTipOnMinAge: () => exists(`${phase}-rolloverMinAgeInputIconTip`),
    };
  };

  const setReplicas = (phase: Phases) => async (value: string) => {
    if (!exists(`${phase}-selectedReplicaCount`)) {
      await createFormToggleAction(`${phase}-setReplicasSwitch`)(true);
    }
    await createFormSetValueAction(`${phase}-selectedReplicaCount`)(value);
  };

  const createShrinkActions = (phase: Phases) => {
    const toggleSelector = `${phase}-shrinkSwitch`;
    return {
      shrinkExists: () => exists(toggleSelector),
      toggleShrink: createFormToggleAction(toggleSelector),
      setShrink: createFormSetValueAction(`${phase}-primaryShardCount`),
    };
  };

  const setFreeze = createFormToggleAction('freezeSwitch');
  const freezeExists = () => exists('freezeSwitch');

  const createReadonlyActions = (phase: Phases) => {
    const toggleSelector = `${phase}-readonlySwitch`;
    return {
      readonlyExists: () => exists(toggleSelector),
      toggleReadonly: createFormToggleAction(toggleSelector),
    };
  };

  const createSearchableSnapshotActions = (phase: Phases) => {
    const fieldSelector = `searchableSnapshotField-${phase}`;
    const licenseCalloutSelector = `${fieldSelector}.searchableSnapshotDisabledDueToLicense`;
    const rolloverCalloutSelector = `${fieldSelector}.searchableSnapshotFieldsNoRolloverCallout`;
    const toggleSelector = `${fieldSelector}.searchableSnapshotToggle`;

    const toggleSearchableSnapshot = createFormToggleAction(toggleSelector);
    return {
      searchableSnapshotDisabledDueToRollover: () => exists(rolloverCalloutSelector),
      searchableSnapshotDisabled: () =>
        exists(licenseCalloutSelector) && find(licenseCalloutSelector).props().disabled === true,
      searchableSnapshotsExists: () => exists(fieldSelector),
      findSearchableSnapshotToggle: () => find(toggleSelector),
      searchableSnapshotDisabledDueToLicense: () =>
        exists(`${fieldSelector}.searchableSnapshotDisabledDueToLicense`),
      toggleSearchableSnapshot,
      setSearchableSnapshot: async (value: string) => {
        if (!exists(`searchableSnapshotField-${phase}.searchableSnapshotCombobox`)) {
          await toggleSearchableSnapshot(true);
        }
        act(() => {
          find(`searchableSnapshotField-${phase}.searchableSnapshotCombobox`).simulate('change', [
            { label: value },
          ]);
        });
        component.update();
      },
    };
  };

  const createToggleDeletePhaseActions = () => {
    const enablePhase = async () => {
      await act(async () => {
        find('enableDeletePhaseButton').simulate('click');
      });
      component.update();
    };

    const disablePhase = async () => {
      await act(async () => {
        find('disableDeletePhaseButton').simulate('click');
      });
      component.update();
    };

    return {
      enablePhase,
      disablePhase,
    };
  };

  const hasRolloverSettingRequiredCallout = (): boolean => exists('rolloverSettingsRequired');

  const createNodeAllocationActions = (phase: Phases) => {
    const controlsSelector = `${phase}-dataTierAllocationControls`;
    const dataTierSelector = `${controlsSelector}.dataTierSelect`;
    const nodeAttrsSelector = `${phase}-selectedNodeAttrs`;

    return {
      hasDataTierAllocationControls: () => exists(controlsSelector),
      openNodeAttributesSection: async () => {
        await act(async () => {
          find(dataTierSelector).simulate('click');
        });
        component.update();
      },
      hasNodeAttributesSelect: (): boolean => exists(nodeAttrsSelector),
      getNodeAttributesSelectOptions: () => find(nodeAttrsSelector).find('option'),
      setDataAllocation: async (value: DataTierAllocationType) => {
        act(() => {
          find(dataTierSelector).simulate('click');
        });
        component.update();
        await act(async () => {
          switch (value) {
            case 'node_roles':
              find(`${controlsSelector}.defaultDataAllocationOption`).simulate('click');
              break;
            case 'node_attrs':
              find(`${controlsSelector}.customDataAllocationOption`).simulate('click');
              break;
            default:
              find(`${controlsSelector}.noneDataAllocationOption`).simulate('click');
          }
        });
        component.update();
      },
      setSelectedNodeAttribute: createFormSetValueAction(nodeAttrsSelector),
      hasNoNodeAttrsWarning: () => exists('noNodeAttributesWarning'),
      hasDefaultAllocationWarning: () => exists('defaultAllocationWarning'),
      hasDefaultAllocationNotice: () => exists('defaultAllocationNotice'),
      hasNodeDetailsFlyout: () => exists(`${phase}-viewNodeDetailsFlyoutButton`),
      openNodeDetailsFlyout: async () => {
        await act(async () => {
          find(`${phase}-viewNodeDetailsFlyoutButton`).simulate('click');
        });
        component.update();
      },
    };
  };

  const expectErrorMessages = (expectedMessages: string[]) => {
    const errorMessages = component.find('.euiFormErrorText');
    expect(errorMessages.length).toBe(expectedMessages.length);
    expectedMessages.forEach((expectedErrorMessage) => {
      let foundErrorMessage;
      for (let i = 0; i < errorMessages.length; i++) {
        if (errorMessages.at(i).text() === expectedErrorMessage) {
          foundErrorMessage = true;
        }
      }
      expect(foundErrorMessage).toBe(true);
    });
  };

  /*
   * For new we rely on a setTimeout to ensure that error messages have time to populate
   * the form object before we look at the form object. See:
   * x-pack/plugins/index_lifecycle_management/public/application/sections/edit_policy/form/form_errors_context.tsx
   * for where this logic lives.
   */
  const runTimers = () => {
    act(() => {
      jest.runAllTimers();
    });
    component.update();
  };

  return {
    ...testBed,
    runTimers,
    actions: {
      saveAsNewPolicy: createFormToggleAction('saveAsNewSwitch'),
      setPolicyName: createFormSetValueAction('policyNameField'),
      setWaitForSnapshotPolicy,
      savePolicy,
      hasGlobalErrorCallout: () => exists('policyFormErrorsCallout'),
      expectErrorMessages,
      timeline: {
        hasHotPhase: () => exists('ilmTimelineHotPhase'),
        hasWarmPhase: () => exists('ilmTimelineWarmPhase'),
        hasColdPhase: () => exists('ilmTimelineColdPhase'),
        hasDeletePhase: () => exists('ilmTimelineDeletePhase'),
      },
      hot: {
        setMaxSize,
        setMaxDocs,
        setMaxAge,
        toggleRollover,
        toggleDefaultRollover,
        hasRolloverSettingRequiredCallout,
        hasErrorIndicator: () => exists('phaseErrorIndicator-hot'),
        ...createForceMergeActions('hot'),
        ...createIndexPriorityActions('hot'),
        ...createShrinkActions('hot'),
        ...createReadonlyActions('hot'),
        ...createSearchableSnapshotActions('hot'),
      },
      warm: {
        enable: enable('warm'),
        ...createMinAgeActions('warm'),
        setReplicas: setReplicas('warm'),
        hasErrorIndicator: () => exists('phaseErrorIndicator-warm'),
        ...createShrinkActions('warm'),
        ...createForceMergeActions('warm'),
        ...createReadonlyActions('warm'),
        ...createIndexPriorityActions('warm'),
        ...createNodeAllocationActions('warm'),
      },
      cold: {
        enable: enable('cold'),
        ...createMinAgeActions('cold'),
        setReplicas: setReplicas('cold'),
        setFreeze,
        freezeExists,
        hasErrorIndicator: () => exists('phaseErrorIndicator-cold'),
        ...createIndexPriorityActions('cold'),
        ...createSearchableSnapshotActions('cold'),
        ...createNodeAllocationActions('cold'),
      },
      delete: {
        isShown: () => exists('delete-phaseContent'),
        ...createToggleDeletePhaseActions(),
        ...createMinAgeActions('delete'),
      },
    },
  };
};
