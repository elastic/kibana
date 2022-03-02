/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockHttpValues, mockKibanaValues } from '../../../../../__mocks__/kea_logic';
import { sourceConfigData } from '../../../../__mocks__/content_sources.mock';

import { itShowsServerErrorAsFlashMessage } from '../../../../../test_helpers';

jest.mock('../../../../app_logic', () => ({
  AppLogic: { values: { isOrganization: true } },
}));

import { ExternalConnectorLogic, ExternalConnectorValues } from './external_connector_logic';

describe('ExternalConnectorLogic', () => {
  const { mount } = new LogicMounter(ExternalConnectorLogic);
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;

  const DEFAULT_VALUES: ExternalConnectorValues = {
    dataLoading: true,
    buttonLoading: false,
    externalConnectorUrl: '',
    externalConnectorApiKey: '',
    sourceConfigData: {
      name: '',
      categories: [],
    },
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
        expect(ExternalConnectorLogic.values.dataLoading).toEqual(false);
      });

      it('saves the external url', () => {
        expect(ExternalConnectorLogic.values.externalConnectorUrl).toEqual(
          sourceConfigData.configuredFields.url
        );
      });

      it('saves the source config', () => {
        expect(ExternalConnectorLogic.values.sourceConfigData).toEqual(sourceConfigData);
      });

      it('sets undefined url to empty string', () => {
        ExternalConnectorLogic.actions.fetchExternalSourceSuccess({
          ...sourceConfigData,
          configuredFields: { ...sourceConfigData.configuredFields, url: undefined },
        });
        expect(ExternalConnectorLogic.values.externalConnectorUrl).toEqual('');
      });
      it('sets undefined api key to empty string', () => {
        ExternalConnectorLogic.actions.fetchExternalSourceSuccess({
          ...sourceConfigData,
          configuredFields: { ...sourceConfigData.configuredFields, apiKey: undefined },
        });
        expect(ExternalConnectorLogic.values.externalConnectorApiKey).toEqual('');
      });
    });

    describe('saveExternalConnectorConfigSuccess', () => {
      it('turns off the button loading flag', () => {
        mount({
          buttonLoading: true,
        });

        ExternalConnectorLogic.actions.saveExternalConnectorConfigSuccess('external');

        expect(ExternalConnectorLogic.values.buttonLoading).toEqual(false);
      });
    });

    describe('setExternalConnectorApiKey', () => {
      it('updates the api key', () => {
        ExternalConnectorLogic.actions.setExternalConnectorApiKey('abcd1234');

        expect(ExternalConnectorLogic.values.externalConnectorApiKey).toEqual('abcd1234');
      });
    });

    describe('setExternalConnectorUrl', () => {
      it('updates the url', () => {
        ExternalConnectorLogic.actions.setExternalConnectorUrl('https://www.elastic.co');

        expect(ExternalConnectorLogic.values.externalConnectorUrl).toEqual(
          'https://www.elastic.co'
        );
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

    describe('saveExternalConnectorConfig', () => {
      it('saves the external connector config', () => {
        const saveExternalConnectorConfigSuccess = jest.spyOn(
          ExternalConnectorLogic.actions,
          'saveExternalConnectorConfigSuccess'
        );
        ExternalConnectorLogic.actions.saveExternalConnectorConfig({
          url: 'url',
          apiKey: 'apiKey',
        });
        expect(saveExternalConnectorConfigSuccess).toHaveBeenCalled();
        expect(navigateToUrl).toHaveBeenCalledWith('/sources/add/external');
      });
    });
  });
});
