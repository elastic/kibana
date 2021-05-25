/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { TestBedConfig } from '@kbn/test/jest';

import { AppServicesContext } from '../../../public/types';

import {
  Phase,
  createEnablePhaseAction,
  createNodeAllocationActions,
  createFormToggleAction,
  createFormSetValueAction,
  setReplicas,
  savePolicy,
} from '../helpers';
import { initTestBed } from './init_test_bed';

type SetupReturn = ReturnType<typeof setup>;
export type EditPolicyTestBed = SetupReturn extends Promise<infer U> ? U : SetupReturn;

export const setup = async (arg?: {
  appServicesContext?: Partial<AppServicesContext>;
  testBedConfig?: Partial<TestBedConfig>;
}) => {
  const testBed = await initTestBed(arg);

  const { find, component, form, exists } = testBed;

  const createFormCheckboxAction = (dataTestSubject: string) => async (checked: boolean) => {
    await act(async () => {
      form.selectCheckBox(dataTestSubject, checked);
    });
    component.update();
  };

  const setWaitForSnapshotPolicy = async (snapshotPolicyName: string) => {
    act(() => {
      find('snapshotPolicyCombobox').simulate('change', [{ label: snapshotPolicyName }]);
    });
    component.update();
  };

  const toggleDefaultRollover = createFormToggleAction(testBed, 'useDefaultRolloverSwitch');

  const toggleRollover = createFormToggleAction(testBed, 'rolloverSwitch');

  const setMaxPrimaryShardSize = async (value: string, units?: string) => {
    await act(async () => {
      find('hot-selectedMaxPrimaryShardSize').simulate('change', { target: { value } });
      if (units) {
        find('hot-selectedMaxPrimaryShardSize.select').simulate('change', {
          target: { value: units },
        });
      }
    });
    component.update();
  };

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

  const setMaxDocs = createFormSetValueAction(testBed, 'hot-selectedMaxDocuments');

  const setMaxAge = async (value: string, units?: string) => {
    await act(async () => {
      find('hot-selectedMaxAge').simulate('change', { target: { value } });
      if (units) {
        find('hot-selectedMaxAgeUnits.select').simulate('change', { target: { value: units } });
      }
    });
    component.update();
  };

  const createForceMergeActions = (phase: Phase) => {
    const toggleSelector = `${phase}-forceMergeSwitch`;
    return {
      forceMergeFieldExists: () => exists(toggleSelector),
      toggleForceMerge: createFormToggleAction(testBed, toggleSelector),
      setForcemergeSegmentsCount: createFormSetValueAction(
        testBed,
        `${phase}-selectedForceMergeSegments`
      ),
      setBestCompression: createFormCheckboxAction(`${phase}-bestCompression`),
    };
  };

  const createIndexPriorityActions = (phase: Phase) => {
    const toggleSelector = `${phase}-indexPrioritySwitch`;
    return {
      indexPriorityExists: () => exists(toggleSelector),
      toggleIndexPriority: createFormToggleAction(testBed, toggleSelector),
      setIndexPriority: createFormSetValueAction(testBed, `${phase}-indexPriority`),
    };
  };

  const createMinAgeActions = (phase: Phase) => {
    return {
      hasMinAgeInput: () => exists(`${phase}-selectedMinimumAge`),
      setMinAgeValue: createFormSetValueAction(testBed, `${phase}-selectedMinimumAge`),
      setMinAgeUnits: createFormSetValueAction(testBed, `${phase}-selectedMinimumAgeUnits`),
      hasRolloverTipOnMinAge: () => exists(`${phase}-rolloverMinAgeInputIconTip`),
    };
  };

  const createShrinkActions = (phase: Phase) => {
    const toggleSelector = `${phase}-shrinkSwitch`;
    return {
      shrinkExists: () => exists(toggleSelector),
      toggleShrink: createFormToggleAction(testBed, toggleSelector),
      setShrink: createFormSetValueAction(testBed, `${phase}-primaryShardCount`),
    };
  };

  const createSetFreeze = (phase: Phase) =>
    createFormToggleAction(testBed, `${phase}-freezeSwitch`);
  const createFreezeExists = (phase: Phase) => () => exists(`${phase}-freezeSwitch`);

  const createReadonlyActions = (phase: Phase) => {
    const toggleSelector = `${phase}-readonlySwitch`;
    return {
      readonlyExists: () => exists(toggleSelector),
      toggleReadonly: createFormToggleAction(testBed, toggleSelector),
    };
  };

  const createSearchableSnapshotActions = (phase: Phase) => {
    const fieldSelector = `searchableSnapshotField-${phase}`;
    const licenseCalloutSelector = `${fieldSelector}.searchableSnapshotDisabledDueToLicense`;
    const toggleSelector = `${fieldSelector}.searchableSnapshotToggle`;

    const toggleSearchableSnapshot = createFormToggleAction(testBed, toggleSelector);
    return {
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

  const enableDeletePhase = async (isEnabled: boolean) => {
    const buttonSelector = isEnabled ? 'enableDeletePhaseButton' : 'disableDeletePhaseButton';
    await act(async () => {
      find(buttonSelector).simulate('click');
    });
    component.update();
  };

  const hasRolloverSettingRequiredCallout = (): boolean => exists('rolloverSettingsRequired');

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
   * We rely on a setTimeout (dedounce) to display error messages under the form fields.
   * This handler runs all the timers so we can assert for errors in our tests.
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
      saveAsNewPolicy: createFormToggleAction(testBed, 'saveAsNewSwitch'),
      setPolicyName: createFormSetValueAction(testBed, 'policyNameField'),
      setWaitForSnapshotPolicy,
      savePolicy: () => savePolicy(testBed),
      hasGlobalErrorCallout: () => exists('policyFormErrorsCallout'),
      expectErrorMessages,
      timeline: {
        hasHotPhase: () => exists('ilmTimelineHotPhase'),
        hasWarmPhase: () => exists('ilmTimelineWarmPhase'),
        hasColdPhase: () => exists('ilmTimelineColdPhase'),
        hasFrozenPhase: () => exists('ilmTimelineFrozenPhase'),
        hasDeletePhase: () => exists('ilmTimelineDeletePhase'),
      },
      hot: {
        setMaxSize,
        setMaxDocs,
        setMaxAge,
        setMaxPrimaryShardSize,
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
        enable: createEnablePhaseAction(testBed, 'warm'),
        ...createMinAgeActions('warm'),
        setReplicas: (value: string) => setReplicas(testBed, 'warm', value),
        hasErrorIndicator: () => exists('phaseErrorIndicator-warm'),
        ...createShrinkActions('warm'),
        ...createForceMergeActions('warm'),
        ...createReadonlyActions('warm'),
        ...createIndexPriorityActions('warm'),
        ...createNodeAllocationActions(testBed, 'warm'),
      },
      cold: {
        enable: createEnablePhaseAction(testBed, 'cold'),
        ...createMinAgeActions('cold'),
        setReplicas: (value: string) => setReplicas(testBed, 'cold', value),
        setFreeze: createSetFreeze('cold'),
        freezeExists: createFreezeExists('cold'),
        ...createReadonlyActions('cold'),
        hasErrorIndicator: () => exists('phaseErrorIndicator-cold'),
        ...createIndexPriorityActions('cold'),
        ...createSearchableSnapshotActions('cold'),
        ...createNodeAllocationActions(testBed, 'cold'),
      },
      frozen: {
        enable: createEnablePhaseAction(testBed, 'frozen'),
        ...createMinAgeActions('frozen'),
        hasErrorIndicator: () => exists('phaseErrorIndicator-frozen'),
        ...createSearchableSnapshotActions('frozen'),
      },
      delete: {
        isShown: () => exists('delete-phaseContent'),
        enable: enableDeletePhase,
        ...createMinAgeActions('delete'),
      },
    },
  };
};
