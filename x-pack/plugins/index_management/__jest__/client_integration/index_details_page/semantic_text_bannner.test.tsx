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
  const setup = registerTestBed(SemanticTextBanner, {
    defaultProps: { isSemanticTextEnabled: true },
    memoryRouter: { wrapComponent: false },
  });
  const { exists, find } = setup();

  it('should display the banner', () => {
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
    expect(exists('indexDetailsMappingsSemanticTextBanner')).toBe(true);
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
