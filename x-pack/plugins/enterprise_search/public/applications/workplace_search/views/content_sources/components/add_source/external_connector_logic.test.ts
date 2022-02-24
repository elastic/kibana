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
} from '../../../../../__mocks__/kea_logic';
import { sourceConfigData } from '../../../../__mocks__/content_sources.mock';

import { i18n } from '@kbn/i18n';
import { nextTick } from '@kbn/test-jest-helpers';

import { docLinks } from '../../../../../shared/doc_links';
import { itShowsServerErrorAsFlashMessage } from '../../../../../test_helpers';

jest.mock('../../../../app_logic', () => ({
  AppLogic: { values: { isOrganization: true } },
}));
import { AppLogic } from '../../../../app_logic';

import { SOURCE_NAMES, SOURCE_OBJ_TYPES } from '../../../../constants';
import {
  SOURCES_PATH,
  PRIVATE_SOURCES_PATH,
  getSourcesPath,
  ADD_CUSTOM_PATH,
} from '../../../../routes';
import { CustomSource, FeatureIds } from '../../../../types';
import { PERSONAL_DASHBOARD_SOURCE_ERROR } from '../../constants';
import { SourcesLogic } from '../../sources_logic';

import {
  AddSourceLogic,
  AddSourceSteps,
  SourceConfigData,
  SourceConnectData,
  OrganizationsMap,
} from './add_source_logic';
import { ExternalConnectorLogic, ExternalConnectorValues } from './external_connector_logic';

describe('ExternalConnectorLogic', () => {
  const { mount } = new LogicMounter(ExternalConnectorLogic);
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;
  // const { clearFlashMessages, flashAPIErrors, setErrorMessage } = mockFlashMessageHelpers;

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
    jest.spyOn(ExternalConnectorLogic.actions, 'fetchExternalSource');

    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(ExternalConnectorLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onRecieveExternalSource', () => {
      it('turns off the data loading flag', () => {});

      it('saves the external url', () => {});

      it('saves the source config');
    });

    describe('onSaveExternalConnectorConfigSuccess', () => {
      it('turns off the button loading flag', () => {});
    });

    describe('setExternalConnectorApiKey', () => {
      it('updates the api key', () => {});
    });

    describe('setExternalConnectorUrl', () => {
      it('updates the url', () => {});
    });
  });

  describe('listeners', () => {
    describe('fetchExternalSource', () => {
      it('retrieves config info on the "external" connector', () => {});

      itShowsServerErrorAsFlashMessage(http.get, () => {
        mount();
        ExternalConnectorLogic.actions.fetchExternalSource();
      });
    });

    describe('saveExternalConnectorConfig', () => {
      it('saves config info for the new content source ', () => {});

      itShowsServerErrorAsFlashMessage(http.get, () => {
        mount();
        ExternalConnectorLogic.actions.fetchExternalSource();
      });
    });
  });
});
