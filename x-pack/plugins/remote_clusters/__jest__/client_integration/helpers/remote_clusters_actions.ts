/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestBed } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
export interface RemoteClustersActions {
  docsButtonExists: () => boolean;
  pageTitle: {
    exists: () => boolean;
    text: () => string;
  };
  nameInput: {
    setValue: (name: string) => void;
    getValue: () => string;
    isDisabled: () => boolean;
  };
  skipUnavailableSwitch: {
    exists: () => boolean;
    toggle: () => void;
    isChecked: () => boolean;
  };
  connectionModeSwitch: {
    exists: () => boolean;
    toggle: () => void;
    isChecked: () => boolean;
  };
  cloudUrlSwitch: {
    toggle: () => void;
    exists: () => boolean;
    isChecked: () => boolean;
  };
  cloudUrlInput: {
    exists: () => boolean;
    getValue: () => string;
  };
  seedsInput: {
    setValue: (seed: string) => void;
    getValue: () => string;
  };
  proxyAddressInput: {
    setValue: (proxyAddress: string) => void;
    exists: () => boolean;
  };
  serverNameInput: {
    getLabel: () => string;
    exists: () => boolean;
  };
  saveButton: {
    click: () => void;
    isDisabled: () => boolean;
  };
  getErrorMessages: () => string[];
  globalErrorExists: () => boolean;
}
export const createRemoteClustersActions = (testBed: TestBed): RemoteClustersActions => {
  const { form, exists, find, component } = testBed;

  const docsButtonExists = () => exists('remoteClusterDocsButton');
  const createPageTitleActions = () => {
    const pageTitleSelector = 'remoteClusterPageTitle';
    return {
      pageTitle: {
        exists: () => exists(pageTitleSelector),
        text: () => find(pageTitleSelector).text(),
      },
    };
  };
  const createNameInputActions = () => {
    const nameInputSelector = 'remoteClusterFormNameInput';
    return {
      nameInput: {
        setValue: (name: string) => form.setInputValue(nameInputSelector, name),
        getValue: () => find(nameInputSelector).props().value,
        isDisabled: () => find(nameInputSelector).props().disabled,
      },
    };
  };

  const createSkipUnavailableActions = () => {
    const skipUnavailableToggleSelector = 'remoteClusterFormSkipUnavailableFormToggle';
    return {
      skipUnavailableSwitch: {
        exists: () => exists(skipUnavailableToggleSelector),
        toggle: () => {
          act(() => {
            form.toggleEuiSwitch(skipUnavailableToggleSelector);
          });
          component.update();
        },
        isChecked: () => find(skipUnavailableToggleSelector).props()['aria-checked'],
      },
    };
  };

  const createConnectionModeActions = () => {
    const connectionModeToggleSelector = 'remoteClusterFormConnectionModeToggle';
    return {
      connectionModeSwitch: {
        exists: () => exists(connectionModeToggleSelector),
        toggle: () => {
          act(() => {
            form.toggleEuiSwitch(connectionModeToggleSelector);
          });
          component.update();
        },
        isChecked: () => find(connectionModeToggleSelector).props()['aria-checked'],
      },
    };
  };

  const createCloudUrlSwitchActions = () => {
    const cloudUrlSelector = 'remoteClusterFormCloudUrlToggle';
    return {
      cloudUrlSwitch: {
        exists: () => exists(cloudUrlSelector),
        toggle: () => {
          act(() => {
            form.toggleEuiSwitch(cloudUrlSelector);
          });
          component.update();
        },
        isChecked: () => find(cloudUrlSelector).props()['aria-checked'],
      },
    };
  };

  const createSeedsInputActions = () => {
    const seedsInputSelector = 'remoteClusterFormSeedsInput';
    return {
      seedsInput: {
        setValue: (seed: string) => form.setComboBoxValue(seedsInputSelector, seed),
        getValue: () => find(seedsInputSelector).text(),
      },
    };
  };

  const createProxyAddressActions = () => {
    const proxyAddressSelector = 'remoteClusterFormProxyAddressInput';
    return {
      proxyAddressInput: {
        setValue: (proxyAddress: string) => form.setInputValue(proxyAddressSelector, proxyAddress),
        exists: () => exists(proxyAddressSelector),
      },
    };
  };

  const createSaveButtonActions = () => {
    const click = () => {
      act(() => {
        find('remoteClusterFormSaveButton').simulate('click');
      });

      component.update();
    };
    const isDisabled = () => find('remoteClusterFormSaveButton').props().disabled;
    return { saveButton: { click, isDisabled } };
  };

  const createServerNameActions = () => {
    const serverNameSelector = 'remoteClusterFormServerNameFormRow';
    return {
      serverNameInput: {
        getLabel: () => find('remoteClusterFormServerNameFormRow').find('label').text(),
        exists: () => exists(serverNameSelector),
      },
    };
  };

  const globalErrorExists = () => exists('remoteClusterFormGlobalError');

  const createCloudUrlInputActions = () => {
    const cloudUrlInputSelector = 'remoteClusterFormCloudUrlInput';
    return {
      cloudUrlInput: {
        exists: () => exists(cloudUrlInputSelector),
        getValue: () => find(cloudUrlInputSelector).props().value,
      },
    };
  };
  return {
    docsButtonExists,
    ...createPageTitleActions(),
    ...createNameInputActions(),
    ...createSkipUnavailableActions(),
    ...createConnectionModeActions(),
    ...createCloudUrlSwitchActions(),
    ...createSeedsInputActions(),
    ...createCloudUrlInputActions(),
    ...createProxyAddressActions(),
    ...createServerNameActions(),
    ...createSaveButtonActions(),
    getErrorMessages: form.getErrorsMessages,
    globalErrorExists,
  };
};
