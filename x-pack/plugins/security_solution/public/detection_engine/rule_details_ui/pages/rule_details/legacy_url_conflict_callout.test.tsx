/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
// eslint-disable-next-line no-restricted-imports
import { LegacyUrlConflictCallOut } from './legacy_url_conflict_callout';
import { render, screen } from '@testing-library/react';
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

describe('<LegacyUrlConflictCallOut />', () => {
  beforeEach(() => {
    mockRedirectLegacyUrl.mockReset();
    mockGetLegacyUrlConflict.mockReset();
  });

  it('renders null if no rule', () => {
    render(<LegacyUrlConflictCallOut rule={null} spacesApi={mockSpacesApi} />);
    expect(screen.queryByTestId('legacyUrlConflictCallOut-wrapper')).toBeNull();
    expect(mockRedirectLegacyUrl).not.toHaveBeenCalled();
    expect(mockGetLegacyUrlConflict).not.toHaveBeenCalled();
  });

  it('renders null if spacesApi is undefined', () => {
    render(<LegacyUrlConflictCallOut rule={mockRule} spacesApi={undefined} />);
    expect(screen.queryByTestId('legacyUrlConflictCallOut-wrapper')).toBeNull();
    expect(mockRedirectLegacyUrl).not.toHaveBeenCalled();
    expect(mockGetLegacyUrlConflict).not.toHaveBeenCalled();
  });

  it('renders null if rule.outcome is not "conflict"', () => {
    render(<LegacyUrlConflictCallOut rule={null} spacesApi={mockSpacesApi} />);
    expect(screen.queryByTestId('legacyUrlConflictCallOut-wrapper')).toBeNull();
    expect(mockRedirectLegacyUrl).not.toHaveBeenCalled();
    expect(mockGetLegacyUrlConflict).not.toHaveBeenCalled();
  });

  it('renders LegacyUrlConfictCallout if rule.outcome is "conflict" and alias_target_id and spacesApi are defined', () => {
    render(
      <LegacyUrlConflictCallOut
        rule={{ ...mockRule, outcome: 'conflict', alias_target_id: 'mock_alias_target_id' }}
        spacesApi={mockSpacesApi}
      />
    );
    expect(screen.queryByTestId('legacyUrlConflictCallOut-wrapper')).toBeInTheDocument();
    expect(mockRedirectLegacyUrl).not.toHaveBeenCalled();
    expect(mockGetLegacyUrlConflict).toHaveBeenCalledWith({
      currentObjectId: mockRule.id,
      objectNoun: 'rule',
      otherObjectId: 'mock_alias_target_id',
      otherObjectPath: 'rules/id/mock_alias_target_id',
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
  language: 'kuery',
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
