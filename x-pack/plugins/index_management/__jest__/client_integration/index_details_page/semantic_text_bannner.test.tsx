/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { SemanticTextBanner } from '../../../public/application/sections/home/index_list/details_page/semantic_text_banner';

describe('When semantic_text is enabled', () => {
  let exists: any;
  let find: any;
  let wrapper: any;
  let getItemSpy: jest.SpyInstance;
  let setItemSpy: jest.SpyInstance;

  beforeEach(() => {
    getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
    setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    const setup = registerTestBed(SemanticTextBanner, {
      defaultProps: { isSemanticTextEnabled: true, isPlatinumLicense: true },
      memoryRouter: { wrapComponent: false },
    });
    const testBed = setup();
    ({ exists, find } = testBed);
    wrapper = testBed.component;
  });

  afterEach(() => {
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it('should display the banner', () => {
    expect(getItemSpy).toHaveBeenCalledWith('semantic-text-banner-display');
    expect(exists('indexDetailsMappingsSemanticTextBanner')).toBe(true);
  });

  it('should contain content related to semantic_text', () => {
    expect(find('indexDetailsMappingsSemanticTextBanner').text()).toContain(
      'semantic_text field type now available!'
    );
  });

  it('should hide the banner if dismiss is clicked', async () => {
    await act(async () => {
      find('SemanticTextBannerDismissButton').simulate('click');
    });

    wrapper.update();

    expect(setItemSpy).toHaveBeenCalledWith('semantic-text-banner-display', 'false');
    expect(exists('indexDetailsMappingsSemanticTextBanner')).toBe(false);
  });
});

describe('when user does not have ML permissions', () => {
  const setupWithNoMlPermission = registerTestBed(SemanticTextBanner, {
    defaultProps: { isSemanticTextEnabled: true, isPlatinumLicense: false },
    memoryRouter: { wrapComponent: false },
  });

  const { find } = setupWithNoMlPermission();

  it('should contain content related to semantic_text', () => {
    expect(find('indexDetailsMappingsSemanticTextBanner').text()).toContain(
      'Semantic text now available for platinum license'
    );
  });
});

describe('When semantic_text is disabled', () => {
  const setup = registerTestBed(SemanticTextBanner, {
    defaultProps: { isSemanticTextEnabled: false },
    memoryRouter: { wrapComponent: false },
  });
  const { exists } = setup();

  it('should not display the banner', () => {
    expect(exists('indexDetailsMappingsSemanticTextBanner')).toBe(false);
  });
});
