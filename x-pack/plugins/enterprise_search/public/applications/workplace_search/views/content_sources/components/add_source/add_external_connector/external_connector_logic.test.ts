/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
  mockKibanaValues,
} from '../../../../../../__mocks__/kea_logic';
import { sourceConfigData } from '../../../../../__mocks__/content_sources.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { itShowsServerErrorAsFlashMessage } from '../../../../../../test_helpers';

jest.mock('../../../../../app_logic', () => ({
  AppLogic: { values: { isOrganization: true } },
}));

import { SourceConfigData } from '../add_source_logic';

import { ExternalConnectorLogic, ExternalConnectorValues } from './external_connector_logic';

describe('ExternalConnectorLogic', () => {
  const { mount } = new LogicMounter(ExternalConnectorLogic);
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;

  const DEFAULT_VALUES: ExternalConnectorValues = {
    dataLoading: true,
    buttonLoading: false,
    formDisabled: true,
    externalConnectorUrl: '',
    externalConnectorApiKey: '',
    sourceConfigData: {
      name: '',
      categories: [],
    },
    urlValid: true,
    showInsecureUrlCallout: false,
    insecureUrl: true,
  };

  const DEFAULT_VALUES_SUCCESS: ExternalConnectorValues = {
    ...DEFAULT_VALUES,
    externalConnectorApiKey: 'asdf1234',
    externalConnectorUrl: 'https://www.elastic.co',
    formDisabled: false,
    insecureUrl: false,
    dataLoading: false,
    sourceConfigData,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(ExternalConnectorLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('fetchExternalSourceSuccess', () => {
      beforeEach(() => {
        ExternalConnectorLogic.actions.fetchExternalSourceSuccess(sourceConfigData);
      });

      it('turns off the data loading flag', () => {
        expect(ExternalConnectorLogic.values).toEqual({
          ...DEFAULT_VALUES_SUCCESS,
          dataLoading: false,
        });
      });

      it('saves the external url', () => {
        expect(ExternalConnectorLogic.values).toEqual({
          ...DEFAULT_VALUES_SUCCESS,
          externalConnectorUrl: sourceConfigData.configuredFields.externalConnectorUrl,
        });
      });

      it('saves the source config', () => {
        expect(ExternalConnectorLogic.values).toEqual({
          ...DEFAULT_VALUES_SUCCESS,
          sourceConfigData,
        });
      });

      it('sets undefined url to empty string', () => {
        const newSourceConfigData = {
          ...sourceConfigData,
          configuredFields: {
            ...sourceConfigData.configuredFields,
            externalConnectorUrl: undefined,
          },
        };
        ExternalConnectorLogic.actions.fetchExternalSourceSuccess(newSourceConfigData);
        expect(ExternalConnectorLogic.values).toEqual({
          ...DEFAULT_VALUES_SUCCESS,
          externalConnectorUrl: '',
          insecureUrl: true,
          sourceConfigData: newSourceConfigData,
        });
      });
      it('sets undefined api key to empty string', () => {
        const newSourceConfigData = {
          ...sourceConfigData,
          configuredFields: {
            ...sourceConfigData.configuredFields,
            externalConnectorApiKey: undefined,
          },
        };
        ExternalConnectorLogic.actions.fetchExternalSourceSuccess(newSourceConfigData);
        expect(ExternalConnectorLogic.values).toEqual({
          ...DEFAULT_VALUES_SUCCESS,
          externalConnectorApiKey: '',
          sourceConfigData: newSourceConfigData,
        });
      });
    });

    describe('saveExternalConnectorConfigSuccess', () => {
      it('turns off the button loading flag', () => {
        mount({
          buttonLoading: true,
        });

        ExternalConnectorLogic.actions.saveExternalConnectorConfigSuccess('external');

        expect(ExternalConnectorLogic.values).toEqual({ ...DEFAULT_VALUES, buttonLoading: false });
      });
    });

    describe('saveExternalConnectorConfigError', () => {
      it('turns off the button loading flag', () => {
        mount({
          buttonLoading: true,
        });

        ExternalConnectorLogic.actions.saveExternalConnectorConfigError();

        expect(ExternalConnectorLogic.values).toEqual({ ...DEFAULT_VALUES, buttonLoading: false });
      });
    });

    describe('setExternalConnectorApiKey', () => {
      it('updates the api key', () => {
        ExternalConnectorLogic.actions.setExternalConnectorApiKey('abcd1234');

        expect(ExternalConnectorLogic.values).toEqual({
          ...DEFAULT_VALUES,
          externalConnectorApiKey: 'abcd1234',
        });
      });
    });

    describe('setExternalConnectorUrl', () => {
      it('updates the url', () => {
        ExternalConnectorLogic.actions.setExternalConnectorUrl('https://www.elastic.co');

        expect(ExternalConnectorLogic.values).toEqual({
          ...DEFAULT_VALUES,
          externalConnectorUrl: 'https://www.elastic.co',
          insecureUrl: false,
        });
      });
    });
    describe('setUrlValidation', () => {
      it('updates the url validation', () => {
        ExternalConnectorLogic.actions.setUrlValidation(false);

        expect(ExternalConnectorLogic.values).toEqual({ ...DEFAULT_VALUES, urlValid: false });
      });
    });
    describe('setShowInsecureUrlCallout', () => {
      it('updates the url validation', () => {
        ExternalConnectorLogic.actions.setShowInsecureUrlCallout(true);

        expect(ExternalConnectorLogic.values).toEqual({
          ...DEFAULT_VALUES,
          showInsecureUrlCallout: true,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('fetchExternalSource', () => {
      it('retrieves config info on the "external" connector', () => {
        const promise = Promise.resolve();
        http.get.mockReturnValue(promise);
        ExternalConnectorLogic.actions.fetchExternalSource();

        expect(http.get).toHaveBeenCalledWith(
          '/internal/workplace_search/org/settings/connectors/external'
        );
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        mount();
        ExternalConnectorLogic.actions.fetchExternalSource();
      });
    });
    describe('fetchExternalSourceSuccess', () => {
      it('should show insecure URL callout if url is insecure', () => {
        const setSpy = jest.spyOn(ExternalConnectorLogic.actions, 'setShowInsecureUrlCallout');
        const response: SourceConfigData = {
          ...sourceConfigData,
          configuredFields: {
            publicKey: '',
            privateKey: '',
            consumerKey: '',
            externalConnectorUrl: 'insecure_url',
          },
        };
        ExternalConnectorLogic.actions.fetchExternalSourceSuccess(response);
        expect(setSpy).toHaveBeenCalledWith(true);
      });

      it('should not show insecure URL callout if url is empty', () => {
        const setSpy = jest.spyOn(ExternalConnectorLogic.actions, 'setShowInsecureUrlCallout');
        const response: SourceConfigData = {
          ...sourceConfigData,
          configuredFields: {
            publicKey: '',
            privateKey: '',
            consumerKey: '',
            externalConnectorUrl: '',
          },
        };
        ExternalConnectorLogic.actions.fetchExternalSourceSuccess(response);
        expect(setSpy).toHaveBeenCalledWith(false);
      });

      it('should not show insecure URL callout if url is secure', () => {
        const setSpy = jest.spyOn(ExternalConnectorLogic.actions, 'setShowInsecureUrlCallout');
        const response: SourceConfigData = {
          ...sourceConfigData,
          configuredFields: {
            publicKey: '',
            privateKey: '',
            consumerKey: '',
            externalConnectorUrl: 'https://secure_url',
          },
        };
        ExternalConnectorLogic.actions.fetchExternalSourceSuccess(response);
        expect(setSpy).toHaveBeenCalledWith(false);
      });
    });

    describe('saveExternalConnectorConfig', () => {
      it('saves the external connector config', async () => {
        const validSpy = jest.spyOn(ExternalConnectorLogic.actions, 'setUrlValidation');
        const promise = Promise.resolve();
        http.post.mockReturnValue(promise);
        const saveExternalConnectorConfigSuccess = jest.spyOn(
          ExternalConnectorLogic.actions,
          'saveExternalConnectorConfigSuccess'
        );
        const { flashSuccessToast } = mockFlashMessageHelpers;
        ExternalConnectorLogic.actions.saveExternalConnectorConfig({
          url: 'http://url',
          apiKey: 'apiKey',
        });
        const params = {
          external_connector_url: 'http://url',
          external_connector_api_key: 'apiKey',
          service_type: 'external',
        };
        expect(http.post).toHaveBeenCalledWith(
          '/internal/workplace_search/org/settings/connectors',
          { body: JSON.stringify(params) }
        );

        await nextTick();

        expect(flashSuccessToast).toHaveBeenCalled();
        expect(validSpy).not.toHaveBeenCalled();
        expect(saveExternalConnectorConfigSuccess).toHaveBeenCalled();
        expect(navigateToUrl).toHaveBeenCalledWith('/sources/add/external');
      });
      it('does not save the external connector config if url is invalid', async () => {
        const validSpy = jest.spyOn(ExternalConnectorLogic.actions, 'setUrlValidation');
        const saveExternalConnectorConfigSuccess = jest.spyOn(
          ExternalConnectorLogic.actions,
          'saveExternalConnectorConfigSuccess'
        );
        const { flashSuccessToast } = mockFlashMessageHelpers;
        ExternalConnectorLogic.actions.saveExternalConnectorConfig({
          url: 'url',
          apiKey: 'apiKey',
        });
        expect(http.post).not.toHaveBeenCalled();
        expect(flashSuccessToast).not.toHaveBeenCalled();
        expect(validSpy).toHaveBeenCalledWith(false);
        expect(saveExternalConnectorConfigSuccess).not.toHaveBeenCalled();
        expect(navigateToUrl).not.toHaveBeenCalled();
      });
      itShowsServerErrorAsFlashMessage(http.post, () => {
        mount();
        ExternalConnectorLogic.actions.saveExternalConnectorConfig({
          url: 'http://url',
          apiKey: 'apiKey',
        });
      });
    });
    describe('validateUrl', () => {
      it('should correctly validate a valid URL', () => {
        ExternalConnectorLogic.actions.setExternalConnectorUrl('https://validUrl');
        const validSpy = jest.spyOn(ExternalConnectorLogic.actions, 'setUrlValidation');
        const insecureSpy = jest.spyOn(ExternalConnectorLogic.actions, 'setShowInsecureUrlCallout');
        ExternalConnectorLogic.actions.validateUrl();
        expect(validSpy).toHaveBeenCalledWith(true);
        expect(insecureSpy).toHaveBeenCalledWith(false);
      });
      it('should correctly validate an invalid URL', () => {
        ExternalConnectorLogic.actions.setExternalConnectorUrl('invalidUrl');
        const validSpy = jest.spyOn(ExternalConnectorLogic.actions, 'setUrlValidation');
        const insecureSpy = jest.spyOn(ExternalConnectorLogic.actions, 'setShowInsecureUrlCallout');
        ExternalConnectorLogic.actions.validateUrl();
        expect(validSpy).toHaveBeenCalledWith(false);
        expect(insecureSpy).toHaveBeenCalledWith(true);
      });
    });
  });
});
