/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setupEnvironment, pageHelpers } from './helpers';

const { setup } = pageHelpers.repositoryAdd;

describe('<RepositoryAdd />', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', () => {
    beforeEach(() => {
      httpRequestsMockHelpers.setLoadRepositoryTypesResponse(['fs', 'url']);
    });

    it('should set the correct page title', async () => {
      const { exists, find } = await setup();
      expect(exists('pageTitle')).toBe(true);
      expect(find('pageTitle').text()).toEqual('Register repository');
    });

    it('should not let the user go to the next step if some fields are missing', async () => {
      const { form, actions } = await setup();

      actions.clickNextButton();

      expect(form.getErrorsMessages()).toEqual([
        'Repository name is required.',
        'Type is required.',
      ]);
    });
  });
});
