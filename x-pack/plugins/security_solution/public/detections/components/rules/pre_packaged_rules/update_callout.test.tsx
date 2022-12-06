/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { useKibana } from '../../../../common/lib/kibana';
import { TestProviders } from '../../../../common/mock';
import { useFetchPrebuiltRulesStatusQuery } from '../../../../detection_engine/rule_management/api/hooks/use_fetch_prebuilt_rules_status_query';
import { mockReactQueryResponse } from '../../../../detection_engine/rule_management/api/hooks/__mocks__/mock_react_query_response';
import { UpdatePrePackagedRulesCallOut } from './update_callout';

jest.mock('../../../../common/lib/kibana');
jest.mock(
  '../../../../detection_engine/rule_management/api/hooks/use_fetch_prebuilt_rules_status_query'
);

describe('UpdatePrePackagedRulesCallOut', () => {
  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        docLinks: {
          ELASTIC_WEBSITE_URL: '',
          DOC_LINK_VERSION: '',
          links: {
            siem: { ruleChangeLog: '' },
          },
        },
      },
    });
  });

  it('renders callOutMessage correctly: numberOfUpdatedRules > 0 and numberOfUpdatedTimelines = 0', () => {
    (useFetchPrebuiltRulesStatusQuery as jest.Mock).mockReturnValue(
      mockReactQueryResponse({
        data: {
          rules_custom_installed: 0,
          rules_installed: 0,
          rules_not_installed: 0,
          rules_not_updated: 1,
          timelines_updated: 0,
          timelines_not_installed: 0,
          timelines_not_updated: 0,
        },
      })
    );

    const { getByTestId } = render(<UpdatePrePackagedRulesCallOut />, { wrapper: TestProviders });

    expect(getByTestId('update-callout')).toHaveTextContent(
      'You can update 1 Elastic prebuilt ruleRelease notes'
    );
  });

  it('renders buttonTitle correctly: numberOfUpdatedRules > 0 and numberOfUpdatedTimelines = 0', () => {
    (useFetchPrebuiltRulesStatusQuery as jest.Mock).mockReturnValue(
      mockReactQueryResponse({
        data: {
          rules_custom_installed: 0,
          rules_installed: 0,
          rules_not_installed: 0,
          rules_not_updated: 1,
          timelines_updated: 0,
          timelines_not_installed: 0,
          timelines_not_updated: 0,
        },
      })
    );

    const { getByTestId } = render(<UpdatePrePackagedRulesCallOut />, { wrapper: TestProviders });

    expect(getByTestId('update-callout-button')).toHaveTextContent(
      'Update 1 Elastic prebuilt rule'
    );
  });

  it('renders callOutMessage correctly: numberOfUpdatedRules = 0 and numberOfUpdatedTimelines > 0', () => {
    (useFetchPrebuiltRulesStatusQuery as jest.Mock).mockReturnValue(
      mockReactQueryResponse({
        data: {
          rules_custom_installed: 0,
          rules_installed: 0,
          rules_not_installed: 0,
          rules_not_updated: 0,
          timelines_updated: 0,
          timelines_not_installed: 0,
          timelines_not_updated: 1,
        },
      })
    );

    const { getByTestId } = render(<UpdatePrePackagedRulesCallOut />, { wrapper: TestProviders });

    expect(getByTestId('update-callout')).toHaveTextContent(
      'You can update 1 Elastic prebuilt timelineRelease notes'
    );
  });

  it('renders buttonTitle correctly: numberOfUpdatedRules = 0 and numberOfUpdatedTimelines > 0', () => {
    (useFetchPrebuiltRulesStatusQuery as jest.Mock).mockReturnValue(
      mockReactQueryResponse({
        data: {
          rules_custom_installed: 0,
          rules_installed: 0,
          rules_not_installed: 0,
          rules_not_updated: 0,
          timelines_updated: 0,
          timelines_not_installed: 0,
          timelines_not_updated: 1,
        },
      })
    );

    const { getByTestId } = render(<UpdatePrePackagedRulesCallOut />, { wrapper: TestProviders });

    expect(getByTestId('update-callout-button')).toHaveTextContent(
      'Update 1 Elastic prebuilt timeline'
    );
  });

  it('renders callOutMessage correctly: numberOfUpdatedRules > 0 and numberOfUpdatedTimelines > 0', () => {
    (useFetchPrebuiltRulesStatusQuery as jest.Mock).mockReturnValue(
      mockReactQueryResponse({
        data: {
          rules_custom_installed: 0,
          rules_installed: 0,
          rules_not_installed: 0,
          rules_not_updated: 1,
          timelines_updated: 0,
          timelines_not_installed: 0,
          timelines_not_updated: 1,
        },
      })
    );

    const { getByTestId } = render(<UpdatePrePackagedRulesCallOut />, { wrapper: TestProviders });

    expect(getByTestId('update-callout')).toHaveTextContent(
      'You can update 1 Elastic prebuilt rule and 1 Elastic prebuilt timeline. Note that this will reload deleted Elastic prebuilt rules.Release notes'
    );
  });

  it('renders buttonTitle correctly: numberOfUpdatedRules > 0 and numberOfUpdatedTimelines > 0', () => {
    (useFetchPrebuiltRulesStatusQuery as jest.Mock).mockReturnValue(
      mockReactQueryResponse({
        data: {
          rules_custom_installed: 0,
          rules_installed: 0,
          rules_not_installed: 0,
          rules_not_updated: 1,
          timelines_updated: 0,
          timelines_not_installed: 0,
          timelines_not_updated: 1,
        },
      })
    );

    const { getByTestId } = render(<UpdatePrePackagedRulesCallOut />, { wrapper: TestProviders });

    expect(getByTestId('update-callout-button')).toHaveTextContent(
      'Update 1 Elastic prebuilt rule and 1 Elastic prebuilt timeline'
    );
  });
});
