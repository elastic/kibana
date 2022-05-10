/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactElement } from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { ReturnPrePackagedRulesAndTimelines, usePrePackagedRules } from './use_pre_packaged_rules';
import * as api from './api';
import { shallow } from 'enzyme';
import * as i18n from './translations';

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
  useToasts: jest.fn().mockReturnValue({
    addError: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    remove: jest.fn(),
  }),
}));

jest.mock('./api', () => ({
  getPrePackagedRulesStatus: jest.fn(),
  createPrepackagedRules: jest.fn(),
}));

describe('usePrePackagedRules', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRulesAndTimelines>(
        () =>
          usePrePackagedRules({
            canUserCRUD: null,
            hasIndexWrite: null,
            isAuthenticated: null,
            hasEncryptionKey: null,
            isSignalIndexExists: null,
          })
      );

      await waitForNextUpdate();

      expect(result.current).toEqual({
        getLoadPrebuiltRulesAndTemplatesButton:
          result.current.getLoadPrebuiltRulesAndTemplatesButton,
        getReloadPrebuiltRulesAndTemplatesButton:
          result.current.getReloadPrebuiltRulesAndTemplatesButton,
        createPrePackagedRules: null,
        loading: true,
        loadingCreatePrePackagedRules: false,
        refetchPrePackagedRulesStatus: null,
        rulesCustomInstalled: null,
        rulesInstalled: null,
        rulesNotInstalled: null,
        rulesNotUpdated: null,
        timelinesInstalled: null,
        timelinesNotInstalled: null,
        timelinesNotUpdated: null,
      });
    });
  });

  test('fetch getPrePackagedRulesStatus', async () => {
    (api.getPrePackagedRulesStatus as jest.Mock).mockResolvedValue({
      rules_custom_installed: 33,
      rules_installed: 12,
      rules_not_installed: 0,
      rules_not_updated: 0,
      timelines_installed: 0,
      timelines_not_installed: 0,
      timelines_not_updated: 0,
    });
    (api.createPrepackagedRules as jest.Mock).mockResolvedValue({
      rules_installed: 0,
      rules_updated: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRulesAndTimelines>(
        () =>
          usePrePackagedRules({
            canUserCRUD: null,
            hasIndexWrite: null,
            isAuthenticated: null,
            hasEncryptionKey: null,
            isSignalIndexExists: null,
          })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({
        getLoadPrebuiltRulesAndTemplatesButton:
          result.current.getLoadPrebuiltRulesAndTemplatesButton,
        getReloadPrebuiltRulesAndTemplatesButton:
          result.current.getReloadPrebuiltRulesAndTemplatesButton,
        createPrePackagedRules: result.current.createPrePackagedRules,
        loading: false,
        loadingCreatePrePackagedRules: false,
        refetchPrePackagedRulesStatus: result.current.refetchPrePackagedRulesStatus,
        rulesCustomInstalled: 33,
        rulesInstalled: 12,
        rulesNotInstalled: 0,
        rulesNotUpdated: 0,
        timelinesInstalled: 0,
        timelinesNotInstalled: 0,
        timelinesNotUpdated: 0,
      });
    });
  });

  test('happy path to createPrePackagedRules', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRulesAndTimelines>(
        () =>
          usePrePackagedRules({
            canUserCRUD: true,
            hasIndexWrite: true,
            isAuthenticated: true,
            hasEncryptionKey: true,
            isSignalIndexExists: true,
          })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      let resp = null;
      if (result.current.createPrePackagedRules) {
        resp = await result.current.createPrePackagedRules();
      }
      expect(resp).toEqual(true);
      expect(api.createPrepackagedRules).toHaveBeenCalled();
      expect(result.current).toEqual({
        getLoadPrebuiltRulesAndTemplatesButton:
          result.current.getLoadPrebuiltRulesAndTemplatesButton,
        getReloadPrebuiltRulesAndTemplatesButton:
          result.current.getReloadPrebuiltRulesAndTemplatesButton,
        createPrePackagedRules: result.current.createPrePackagedRules,
        loading: false,
        loadingCreatePrePackagedRules: false,
        refetchPrePackagedRulesStatus: result.current.refetchPrePackagedRulesStatus,
        rulesCustomInstalled: 33,
        rulesInstalled: 12,
        rulesNotInstalled: 0,
        rulesNotUpdated: 0,
        timelinesInstalled: 0,
        timelinesNotInstalled: 0,
        timelinesNotUpdated: 0,
      });
    });
  });

  test('getLoadPrebuiltRulesAndTemplatesButton - LOAD_PREPACKAGED_RULES', async () => {
    (api.getPrePackagedRulesStatus as jest.Mock).mockResolvedValue({
      rules_custom_installed: 0,
      rules_installed: 0,
      rules_not_installed: 1,
      rules_not_updated: 0,
      timelines_installed: 0,
      timelines_not_installed: 0,
      timelines_not_updated: 0,
    });
    (api.createPrepackagedRules as jest.Mock).mockResolvedValue({
      rules_installed: 0,
      rules_updated: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRulesAndTimelines>(
        () =>
          usePrePackagedRules({
            canUserCRUD: true,
            hasIndexWrite: true,
            isAuthenticated: true,
            hasEncryptionKey: true,
            isSignalIndexExists: true,
          })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      const button = result.current.getLoadPrebuiltRulesAndTemplatesButton({
        isDisabled: false,
        onClick: jest.fn(),
        'data-test-subj': 'button',
      });
      const wrapper = shallow(button as ReactElement);
      expect(wrapper.find('[data-test-subj="button"]').text()).toEqual(i18n.LOAD_PREPACKAGED_RULES);
    });
  });

  test('getLoadPrebuiltRulesAndTemplatesButton - LOAD_PREPACKAGED_TIMELINE_TEMPLATES', async () => {
    (api.getPrePackagedRulesStatus as jest.Mock).mockResolvedValue({
      rules_custom_installed: 0,
      rules_installed: 0,
      rules_not_installed: 0,
      rules_not_updated: 0,
      timelines_installed: 0,
      timelines_not_installed: 1,
      timelines_not_updated: 0,
    });
    (api.createPrepackagedRules as jest.Mock).mockResolvedValue({
      rules_installed: 0,
      rules_updated: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRulesAndTimelines>(
        () =>
          usePrePackagedRules({
            canUserCRUD: true,
            hasIndexWrite: true,
            isAuthenticated: true,
            hasEncryptionKey: true,
            isSignalIndexExists: true,
          })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      const button = result.current.getLoadPrebuiltRulesAndTemplatesButton({
        isDisabled: false,
        onClick: jest.fn(),
        'data-test-subj': 'button',
      });
      const wrapper = shallow(button as ReactElement);
      expect(wrapper.find('[data-test-subj="button"]').text()).toEqual(
        i18n.LOAD_PREPACKAGED_TIMELINE_TEMPLATES
      );
    });
  });

  test('getLoadPrebuiltRulesAndTemplatesButton - LOAD_PREPACKAGED_RULES_AND_TEMPLATES', async () => {
    (api.getPrePackagedRulesStatus as jest.Mock).mockResolvedValue({
      rules_custom_installed: 0,
      rules_installed: 0,
      rules_not_installed: 1,
      rules_not_updated: 0,
      timelines_installed: 0,
      timelines_not_installed: 1,
      timelines_not_updated: 0,
    });
    (api.createPrepackagedRules as jest.Mock).mockResolvedValue({
      rules_installed: 0,
      rules_updated: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRulesAndTimelines>(
        () =>
          usePrePackagedRules({
            canUserCRUD: true,
            hasIndexWrite: true,
            isAuthenticated: true,
            hasEncryptionKey: true,
            isSignalIndexExists: true,
          })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      const button = result.current.getLoadPrebuiltRulesAndTemplatesButton({
        isDisabled: false,
        onClick: jest.fn(),
        'data-test-subj': 'button',
      });
      const wrapper = shallow(button as ReactElement);
      expect(wrapper.find('[data-test-subj="button"]').text()).toEqual(
        i18n.LOAD_PREPACKAGED_RULES_AND_TEMPLATES
      );
    });
  });

  test('getReloadPrebuiltRulesAndTemplatesButton - missing rules and templates', async () => {
    (api.getPrePackagedRulesStatus as jest.Mock).mockResolvedValue({
      rules_custom_installed: 0,
      rules_installed: 1,
      rules_not_installed: 1,
      rules_not_updated: 0,
      timelines_installed: 0,
      timelines_not_installed: 1,
      timelines_not_updated: 0,
    });
    (api.createPrepackagedRules as jest.Mock).mockResolvedValue({
      rules_installed: 0,
      rules_updated: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRulesAndTimelines>(
        () =>
          usePrePackagedRules({
            canUserCRUD: true,
            hasIndexWrite: true,
            isAuthenticated: true,
            hasEncryptionKey: true,
            isSignalIndexExists: true,
          })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      const button = result.current.getReloadPrebuiltRulesAndTemplatesButton({
        isDisabled: false,
        onClick: jest.fn(),
      });
      const wrapper = shallow(button as ReactElement);
      expect(wrapper.find('[data-test-subj="reloadPrebuiltRulesBtn"]').text()).toEqual(
        'Install 1 Elastic prebuilt rule and 1 Elastic prebuilt timeline '
      );
    });
  });

  test('getReloadPrebuiltRulesAndTemplatesButton - missing rules', async () => {
    (api.getPrePackagedRulesStatus as jest.Mock).mockResolvedValue({
      rules_custom_installed: 0,
      rules_installed: 1,
      rules_not_installed: 1,
      rules_not_updated: 0,
      timelines_installed: 0,
      timelines_not_installed: 0,
      timelines_not_updated: 0,
    });
    (api.createPrepackagedRules as jest.Mock).mockResolvedValue({
      rules_installed: 0,
      rules_updated: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRulesAndTimelines>(
        () =>
          usePrePackagedRules({
            canUserCRUD: true,
            hasIndexWrite: true,
            isAuthenticated: true,
            hasEncryptionKey: true,
            isSignalIndexExists: true,
          })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      const button = result.current.getReloadPrebuiltRulesAndTemplatesButton({
        isDisabled: false,
        onClick: jest.fn(),
      });
      const wrapper = shallow(button as ReactElement);
      expect(wrapper.find('[data-test-subj="reloadPrebuiltRulesBtn"]').text()).toEqual(
        'Install 1 Elastic prebuilt rule '
      );
    });
  });

  test('getReloadPrebuiltRulesAndTemplatesButton - missing templates', async () => {
    (api.getPrePackagedRulesStatus as jest.Mock).mockResolvedValue({
      rules_custom_installed: 0,
      rules_installed: 1,
      rules_not_installed: 0,
      rules_not_updated: 0,
      timelines_installed: 1,
      timelines_not_installed: 1,
      timelines_not_updated: 0,
    });
    (api.createPrepackagedRules as jest.Mock).mockResolvedValue({
      rules_installed: 0,
      rules_updated: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRulesAndTimelines>(
        () =>
          usePrePackagedRules({
            canUserCRUD: true,
            hasIndexWrite: true,
            isAuthenticated: true,
            hasEncryptionKey: true,
            isSignalIndexExists: true,
          })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      const button = result.current.getReloadPrebuiltRulesAndTemplatesButton({
        isDisabled: false,
        onClick: jest.fn(),
      });
      const wrapper = shallow(button as ReactElement);
      expect(wrapper.find('[data-test-subj="reloadPrebuiltRulesBtn"]').text()).toEqual(
        'Install 1 Elastic prebuilt timeline '
      );
    });
  });

  test('unhappy path to createPrePackagedRules', async () => {
    const spyOnCreatePrepackagedRules = jest.spyOn(api, 'createPrepackagedRules');
    spyOnCreatePrepackagedRules.mockImplementation(() => {
      throw new Error('Something went wrong');
    });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRulesAndTimelines>(
        () =>
          usePrePackagedRules({
            canUserCRUD: true,
            hasIndexWrite: true,
            isAuthenticated: true,
            hasEncryptionKey: true,
            isSignalIndexExists: true,
          })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      let resp = null;
      if (result.current.createPrePackagedRules) {
        resp = await result.current.createPrePackagedRules();
      }
      expect(resp).toEqual(false);
      expect(spyOnCreatePrepackagedRules).toHaveBeenCalled();
    });
  });

  test('can NOT createPrePackagedRules because canUserCrud === false', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRulesAndTimelines>(
        () =>
          usePrePackagedRules({
            canUserCRUD: false,
            hasIndexWrite: true,
            isAuthenticated: true,
            hasEncryptionKey: true,
            isSignalIndexExists: true,
          })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      let resp = null;
      if (result.current.createPrePackagedRules) {
        resp = await result.current.createPrePackagedRules();
      }
      expect(resp).toEqual(false);
    });
  });

  test('can NOT createPrePackagedRules because hasIndexWrite === false', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRulesAndTimelines>(
        () =>
          usePrePackagedRules({
            canUserCRUD: true,
            hasIndexWrite: false,
            isAuthenticated: true,
            hasEncryptionKey: true,
            isSignalIndexExists: true,
          })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      let resp = null;
      if (result.current.createPrePackagedRules) {
        resp = await result.current.createPrePackagedRules();
      }
      expect(resp).toEqual(false);
    });
  });

  test('can NOT createPrePackagedRules because isAuthenticated === false', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRulesAndTimelines>(
        () =>
          usePrePackagedRules({
            canUserCRUD: true,
            hasIndexWrite: true,
            isAuthenticated: false,
            hasEncryptionKey: true,
            isSignalIndexExists: true,
          })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      let resp = null;
      if (result.current.createPrePackagedRules) {
        resp = await result.current.createPrePackagedRules();
      }
      expect(resp).toEqual(false);
    });
  });

  test('can NOT createPrePackagedRules because hasEncryptionKey === false', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRulesAndTimelines>(
        () =>
          usePrePackagedRules({
            canUserCRUD: true,
            hasIndexWrite: true,
            isAuthenticated: true,
            hasEncryptionKey: false,
            isSignalIndexExists: true,
          })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      let resp = null;
      if (result.current.createPrePackagedRules) {
        resp = await result.current.createPrePackagedRules();
      }
      expect(resp).toEqual(false);
    });
  });

  test('can NOT createPrePackagedRules because isSignalIndexExists === false', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRulesAndTimelines>(
        () =>
          usePrePackagedRules({
            canUserCRUD: true,
            hasIndexWrite: true,
            isAuthenticated: true,
            hasEncryptionKey: true,
            isSignalIndexExists: false,
          })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      let resp = null;
      if (result.current.createPrePackagedRules) {
        resp = await result.current.createPrePackagedRules();
      }
      expect(resp).toEqual(false);
    });
  });
});
