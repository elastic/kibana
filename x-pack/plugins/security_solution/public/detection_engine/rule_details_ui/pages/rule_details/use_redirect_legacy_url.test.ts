/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable no-restricted-imports */

import { renderHook, cleanup } from '@testing-library/react-hooks';
import type { UseLegacyUrlRedirectParams } from './use_redirect_legacy_url';
import { useLegacyUrlRedirect } from './use_redirect_legacy_url';
import type { Rule } from '../../../rule_management/logic';
import type { SpacesApi } from '@kbn/spaces-plugin/public';

const mockRedirectLegacyUrl = jest.fn();
const mockGetLegacyUrlConflict = jest.fn();

const mockSpacesApi: SpacesApi = {
  getActiveSpace$: jest.fn(),
  getActiveSpace: jest.fn(),
  ui: {
    components: {
      getSpacesContextProvider: jest.fn(),
      getShareToSpaceFlyout: jest.fn(),
      getCopyToSpaceFlyout: jest.fn(),
      getSpaceList: jest.fn(),
      getEmbeddableLegacyUrlConflict: jest.fn(),
      getSpaceAvatar: jest.fn(),
      getLegacyUrlConflict: mockGetLegacyUrlConflict,
    },
    redirectLegacyUrl: mockRedirectLegacyUrl,
    useSpaces: jest.fn(),
  },
  hasOnlyDefaultSpace: false,
};

describe('useLegacyUrlRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    cleanup();
  });

  const render = (props: UseLegacyUrlRedirectParams) =>
    renderHook(() => useLegacyUrlRedirect({ ...props }));

  it('should not redirect if rule is null', () => {
    render({ rule: null, spacesApi: mockSpacesApi });
    expect(mockRedirectLegacyUrl).not.toHaveBeenCalled();
  });

  it('should not redirect if spacesApi is undefined', () => {
    render({
      rule: { ...mockRule, id: '123', outcome: 'aliasMatch', alias_purpose: 'savedObjectImport' },
      spacesApi: undefined,
    });
    expect(mockRedirectLegacyUrl).not.toHaveBeenCalled();
  });

  it('should not redirect if outcome is not aliasMatch', () => {
    render({
      rule: { ...mockRule, id: '123', outcome: 'exactMatch', alias_purpose: 'savedObjectImport' },
      spacesApi: mockSpacesApi,
    });
    expect(mockRedirectLegacyUrl).not.toHaveBeenCalled();
  });

  it('should redirect if rule is not null and outcome is aliasMatch', () => {
    render({
      rule: { ...mockRule, id: '123', outcome: 'aliasMatch', alias_purpose: 'savedObjectImport' },
      spacesApi: mockSpacesApi,
    });
    expect(mockRedirectLegacyUrl).toHaveBeenCalledWith({
      aliasPurpose: 'savedObjectImport',
      objectNoun: 'rule',
      path: 'rules/id/123',
    });
  });
});

const mockRule: Rule = {
  id: 'myfakeruleid',
  author: [],
  severity_mapping: [],
  risk_score_mapping: [],
  rule_id: 'rule-1',
  risk_score: 50,
  description: 'some description',
  from: 'now-5m',
  to: 'now',
  name: 'some-name',
  severity: 'low',
  type: 'query',
  query: 'some query',
  index: ['index-1'],
  interval: '5m',
  references: [],
  actions: [],
  enabled: false,
  false_positives: [],
  max_signals: 100,
  tags: [],
  threat: [],
  version: 1,
  revision: 1,
  language: 'kuery',
  exceptions_list: [],
  created_at: '2020-04-09T09:43:51.778Z',
  created_by: 'elastic',
  immutable: false,
  updated_at: '2020-04-09T09:43:51.778Z',
  updated_by: 'elastic',
  related_integrations: [],
  required_fields: [],
  setup: '',
};
