/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogicMounter } from '../../../__mocks__/kea.mock';
import { HttpLogic } from '../../../shared/http';
import { mockHttpValues } from '../../../__mocks__';
import { flashAPIErrors } from '../../../shared/flash_messages';
import { SecurityLogic } from './security_logic';

jest.mock('../../../shared/http', () => ({
  HttpLogic: {
    values: { http: mockHttpValues.http },
  },
}));

jest.mock('../../../shared/flash_messages', () => ({
  flashAPIErrors: jest.fn(),
}));

describe('SecurityLogic', () => {
  const { mount } = new LogicMounter(SecurityLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  const defaultValues = {
    dataLoading: true,
    cachedServerState: {},
    isEnabled: false,
    remote: {},
    standard: {},
    unsavedChanges: true,
  };

  const serverProps = {
    isEnabled: true,
    remote: {
      isEnabled: true,
      contentSources: [{ id: 'gmail', name: 'Gmail', isEnabled: true }],
    },
    standard: {
      isEnabled: true,
      contentSources: [{ id: 'one_drive', name: 'OneDrive', isEnabled: true }],
    },
  };

  it('has expected default values', () => {
    expect(SecurityLogic.values).toEqual(defaultValues);
  });

  describe('actions', () => {
    it('setServerProps', () => {
      SecurityLogic.actions.setServerProps(serverProps);

      expect(SecurityLogic.values.isEnabled).toEqual(true);
    });

    it('setSourceRestrictionsUpdated', () => {
      SecurityLogic.actions.setSourceRestrictionsUpdated(serverProps);

      expect(SecurityLogic.values.isEnabled).toEqual(true);
    });

    it('updatePrivateSourcesEnabled', () => {
      SecurityLogic.actions.updatePrivateSourcesEnabled(false);

      expect(SecurityLogic.values.isEnabled).toEqual(false);
    });

    it('updateRemoteEnabled', () => {
      SecurityLogic.actions.updateRemoteEnabled(false);

      expect(SecurityLogic.values.remote.isEnabled).toEqual(false);
    });

    it('updateStandardEnabled', () => {
      SecurityLogic.actions.updateStandardEnabled(false);

      expect(SecurityLogic.values.standard.isEnabled).toEqual(false);
    });

    it('updateRemoteSource', () => {
      SecurityLogic.actions.setServerProps(serverProps);
      SecurityLogic.actions.updateRemoteSource('gmail', false);

      expect(SecurityLogic.values.remote.contentSources[0].isEnabled).toEqual(false);
    });

    it('updateStandardSource', () => {
      SecurityLogic.actions.setServerProps(serverProps);
      SecurityLogic.actions.updateStandardSource('one_drive', false);

      expect(SecurityLogic.values.standard.contentSources[0].isEnabled).toEqual(false);
    });
  });

  describe('selectors', () => {
    describe('unsavedChanges', () => {
      it('returns true while loading', () => {
        expect(SecurityLogic.values.unsavedChanges).toEqual(true);
      });

      it('returns false after loading', () => {
        SecurityLogic.actions.setServerProps(serverProps);

        expect(SecurityLogic.values.unsavedChanges).toEqual(false);
      });
    });
  });

  describe('listeners', () => {
    describe('initializeSourceRestrictions', () => {
      it('calls API and sets values', async () => {
        const setServerPropsSpy = jest.spyOn(SecurityLogic.actions, 'setServerProps');
        const promise = Promise.resolve(serverProps);
        (HttpLogic.values.http.get as jest.Mock).mockReturnValue(promise);
        SecurityLogic.actions.initializeSourceRestrictions();

        expect(HttpLogic.values.http.get).toHaveBeenCalledWith(
          '/api/workplace_search/org/security/source_restrictions'
        );
        await promise;
        expect(setServerPropsSpy).toHaveBeenCalledWith(serverProps);
      });

      it('handles error', async () => {
        const promise = Promise.reject('this is an error');
        (HttpLogic.values.http.get as jest.Mock).mockReturnValue(promise);

        SecurityLogic.actions.initializeSourceRestrictions();
        try {
          await promise;
        } catch {
          expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
        }
      });
    });

    describe('saveSourceRestrictions', () => {
      it('calls API and sets values', async () => {
        const promise = Promise.resolve(serverProps);
        (HttpLogic.values.http.patch as jest.Mock).mockReturnValue(promise);
        SecurityLogic.actions.setSourceRestrictionsUpdated(serverProps);
        SecurityLogic.actions.saveSourceRestrictions();

        expect(HttpLogic.values.http.patch).toHaveBeenCalledWith(
          '/api/workplace_search/org/security/source_restrictions',
          {
            body: JSON.stringify(serverProps),
          }
        );
      });

      it('handles error', async () => {
        const promise = Promise.reject('this is an error');
        (HttpLogic.values.http.patch as jest.Mock).mockReturnValue(promise);

        SecurityLogic.actions.saveSourceRestrictions();
        try {
          await promise;
        } catch {
          expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
        }
      });
    });

    describe('resetState', () => {
      it('calls API and sets values', async () => {
        SecurityLogic.actions.setServerProps(serverProps);
        SecurityLogic.actions.updatePrivateSourcesEnabled(false);
        SecurityLogic.actions.resetState();

        expect(SecurityLogic.values.isEnabled).toEqual(true);
      });
    });
  });
});
