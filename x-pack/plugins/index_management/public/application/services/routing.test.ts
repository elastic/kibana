/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexDetailsLink, getIndexListUri, navigateToIndexDetailsPage } from './routing';
import { applicationServiceMock, httpServiceMock } from '@kbn/core/public/mocks';
import { ExtensionsService } from '../../services/extensions_service';
import { IndexDetailsSection } from '../../../common/constants';

describe('routing', () => {
  describe('index details link', () => {
    const application = applicationServiceMock.createStartContract();
    const http = httpServiceMock.createSetupContract();

    it('adds the index name to the url', () => {
      const indexName = 'testIndex';
      const url = getIndexDetailsLink(indexName, '');
      expect(url).toContain(`indexName=${indexName}`);
    });

    it('adds the indices table parameters to the url', () => {
      const filter = 'isFollower:true';
      const url = getIndexDetailsLink('testIndex', `?filter=${encodeURIComponent(filter)}`);
      expect(url).toContain(`&filter=${encodeURIComponent(filter)}`);
    });

    it('adds an optional index details tab to the url', () => {
      const tab = 'dynamic-tab';
      const url = getIndexDetailsLink('testIndex', '', tab);
      expect(url).toContain(`tab=${tab}`);
    });
    it('renders default index details route without extensionService indexDetailsPageRoute ', () => {
      const extensionService = {
        indexDetailsPageRoute: null,
      } as ExtensionsService;
      navigateToIndexDetailsPage('testIndex', '', extensionService, application, http);
      expect(application.navigateToUrl).toHaveBeenCalled();
    });

    it('renders route from extensionService indexDetailsPageRoute with tab id', () => {
      const extensionService = {
        indexDetailsPageRoute: {
          renderRoute: (indexName: string, detailsTabId?: string) => {
            return `test_url/${detailsTabId}`;
          },
        },
      } as ExtensionsService;
      navigateToIndexDetailsPage(
        'testIndex',
        '',
        extensionService,
        application,
        http,
        IndexDetailsSection.Settings
      );
      expect(application.navigateToUrl).toHaveBeenCalled();
      expect(application.navigateToUrl).toHaveBeenCalledWith('test_url/settings');
    });
  });

  describe('indices list link', () => {
    it('adds filter to the url', () => {
      const filter = 'isFollower:true';
      const url = getIndexListUri(filter);
      expect(url).toContain(`?filter=${encodeURIComponent(filter)}`);
    });

    it('adds includeHiddenIndices param to the url', () => {
      const url = getIndexListUri('', true);
      expect(url).toContain(`?includeHiddenIndices=true`);
    });
  });
});
