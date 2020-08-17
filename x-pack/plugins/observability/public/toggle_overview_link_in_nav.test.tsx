/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreStart } from 'kibana/public';

import { toggleOverviewLinkInNav } from './toggle_overview_link_in_nav';

describe('toggleOverviewLinkInNav', () => {
  const update = jest.fn();
  afterEach(() => {
    update.mockClear();
  });
  it('hides overview menu', () => {
    const core = ({
      application: {
        capabilities: {
          navLinks: {
            apm: false,
            logs: false,
            metrics: false,
            uptime: false,
          },
        },
      },
      chrome: { navLinks: { update } },
    } as unknown) as CoreStart;
    toggleOverviewLinkInNav(core);
    expect(update).toHaveBeenCalledWith('observability-overview', { hidden: true });
  });
  it('shows overview menu', () => {
    const core = ({
      application: {
        capabilities: {
          navLinks: {
            apm: true,
            logs: false,
            metrics: false,
            uptime: false,
          },
        },
      },
      chrome: { navLinks: { update } },
    } as unknown) as CoreStart;
    toggleOverviewLinkInNav(core);
    expect(update).not.toHaveBeenCalled();
  });
});
