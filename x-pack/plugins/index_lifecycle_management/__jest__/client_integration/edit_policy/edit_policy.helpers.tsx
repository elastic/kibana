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

type Phases = keyof PolicyPhases;

import { POLICY_NAME } from './constants';
import { TestSubjects } from '../helpers';

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

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [`/policies/edit/${POLICY_NAME}`],
    componentRoutePath: `/policies/edit/:policyName`,
  },
  defaultProps: {
    getUrlForApp: () => {},
  },
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

const initTestBed = registerTestBed<TestSubjects>(MyComponent, testBedConfig);

type SetupReturn = ReturnType<typeof setup>;

export type EditPolicyTestBed = SetupReturn extends Promise<infer U> ? U : SetupReturn;

export const setup = async (arg?: { appServicesContext: Partial<AppServicesContext> }) => {
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

  const setMinAgeValue = (phase: Phases) => createFormSetValueAction(`${phase}-selectedMinimumAge`);

  const setMinAgeUnits = (phase: Phases) =>
    createFormSetValueAction(`${phase}-selectedMinimumAgeUnits`);

  const setDataAllocation = (phase: Phases) => async (value: DataTierAllocationType) => {
    act(() => {
      find(`${phase}-dataTierAllocationControls.dataTierSelect`).simulate('click');
    });
    component.update();
    await act(async () => {
      switch (value) {
        case 'node_roles':
          find(`${phase}-dataTierAllocationControls.defaultDataAllocationOption`).simulate('click');
          break;
        case 'node_attrs':
          find(`${phase}-dataTierAllocationControls.customDataAllocationOption`).simulate('click');
          break;
        default:
          find(`${phase}-dataTierAllocationControls.noneDataAllocationOption`).simulate('click');
      }
    });
    component.update();
  };

  const setSelectedNodeAttribute = (phase: Phases) =>
    createFormSetValueAction(`${phase}-selectedNodeAttrs`);

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

  const setReadonly = (phase: Phases) => async (value: boolean) => {
    await createFormToggleAction(`${phase}-readonlySwitch`)(value);
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

  const hasRolloverTipOnMinAge = (phase: Phases) => (): boolean =>
    exists(`${phase}-rolloverMinAgeInputIconTip`);

  return {
    ...testBed,
    actions: {
      saveAsNewPolicy: createFormToggleAction('saveAsNewSwitch'),
      setPolicyName: createFormSetValueAction('policyNameField'),
      setWaitForSnapshotPolicy,
      savePolicy,
      hasGlobalErrorCallout: () => exists('policyFormErrorsCallout'),
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
        hasErrorIndicator: () => exists('phaseErrorIndicator-hot'),
        ...createForceMergeActions('hot'),
        ...createIndexPriorityActions('hot'),
        ...createShrinkActions('hot'),
        setReadonly: setReadonly('hot'),
        ...createSearchableSnapshotActions('hot'),
      },
      warm: {
        enable: enable('warm'),
        setMinAgeValue: setMinAgeValue('warm'),
        setMinAgeUnits: setMinAgeUnits('warm'),
        setDataAllocation: setDataAllocation('warm'),
        setSelectedNodeAttribute: setSelectedNodeAttribute('warm'),
        setReplicas: setReplicas('warm'),
        hasErrorIndicator: () => exists('phaseErrorIndicator-warm'),
        hasRolloverTipOnMinAge: hasRolloverTipOnMinAge('warm'),
        ...createShrinkActions('warm'),
        ...createForceMergeActions('warm'),
        setReadonly: setReadonly('warm'),
        ...createIndexPriorityActions('warm'),
      },
      cold: {
        enable: enable('cold'),
        setMinAgeValue: setMinAgeValue('cold'),
        setMinAgeUnits: setMinAgeUnits('cold'),
        setDataAllocation: setDataAllocation('cold'),
        setSelectedNodeAttribute: setSelectedNodeAttribute('cold'),
        setReplicas: setReplicas('cold'),
        setFreeze,
        freezeExists,
        hasErrorIndicator: () => exists('phaseErrorIndicator-cold'),
        hasRolloverTipOnMinAge: hasRolloverTipOnMinAge('cold'),
        ...createIndexPriorityActions('cold'),
        ...createSearchableSnapshotActions('cold'),
      },
      delete: {
        ...createToggleDeletePhaseActions(),
        hasRolloverTipOnMinAge: hasRolloverTipOnMinAge('delete'),
        setMinAgeValue: setMinAgeValue('delete'),
        setMinAgeUnits: setMinAgeUnits('delete'),
      },
    },
  };
};
