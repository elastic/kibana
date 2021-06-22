/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { KibanaPageTemplateProps } from '../../../../../../../../src/plugins/kibana_react/public';
import { navTabs } from '../../../../app/home/home_navigations';
import { useKibana } from '../../../lib/kibana';
import { SecurityPageName } from '../../../../app/types';
import { usePrimaryNavigation } from './use_primary_navigation';
import { CONSTANTS } from '../../url_state/constants';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import { UrlInputsModel } from '../../../store/inputs/model';

jest.mock('../../../lib/kibana');
jest.mock('../../../hooks/use_selector');

describe('usePrimaryNavigation', () => {
  const mockUrlState = {
    [CONSTANTS.appQuery]: { query: 'host.name:"security-solution-es"', language: 'kuery' },
    [CONSTANTS.savedQuery]: '',
    [CONSTANTS.sourcerer]: {},
    [CONSTANTS.timeline]: {
      activeTab: TimelineTabs.query,
      id: '',
      isOpen: false,
      graphEventId: '',
    },
    [CONSTANTS.timerange]: {
      global: {
        [CONSTANTS.timerange]: {
          from: '2020-07-07T08:20:18.966Z',
          fromStr: 'now-24h',
          kind: 'relative',
          to: '2020-07-08T08:20:18.966Z',
          toStr: 'now',
        },
        linkTo: ['timeline'],
      },
      timeline: {
        [CONSTANTS.timerange]: {
          from: '2020-07-07T08:20:18.966Z',
          fromStr: 'now-24h',
          kind: 'relative',
          to: '2020-07-08T08:20:18.966Z',
          toStr: 'now',
        },
        linkTo: ['global'],
      },
    } as UrlInputsModel,
  };

  const mockProps = {
    ...mockUrlState,
    filters: [],
    navTabs,
    pageName: SecurityPageName.hosts,
  };

  beforeEach(() => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({ urlState: mockUrlState });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          navigateToApp: jest.fn(),
          getUrlForApp: (appId: string, options?: { path?: string; absolute?: boolean }) =>
            `${appId}${options?.path ?? ''}`,
        },
      },
    });
  });

  it('should create navigation config', async () => {
    const { result } = renderHook<{}, KibanaPageTemplateProps['solutionNav']>(() =>
      usePrimaryNavigation(mockProps)
    );
    expect(result).toMatchSnapshot();
  });
});
