/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { UpdatePrePackagedRulesCallOut } from './update_callout';
import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';

jest.mock('../../../../common/lib/kibana');

describe('UpdatePrePackagedRulesCallOut', () => {
  const spyUpdatePrepackagedRulesMsg = jest.spyOn(i18n, 'UPDATE_PREPACKAGED_RULES_MSG');
  const spyUpdatePrepackagedRules = jest.spyOn(i18n, 'UPDATE_PREPACKAGED_RULES');
  const spyUpdatePrepackagedTimelinesMsg = jest.spyOn(i18n, 'UPDATE_PREPACKAGED_TIMELINES_MSG');
  const spyUpdatePrepackagedTimelines = jest.spyOn(i18n, 'UPDATE_PREPACKAGED_TIMELINES');
  const spyUpdatePrepackagedRulesAndTimelinesMsg = jest.spyOn(
    i18n,
    'UPDATE_PREPACKAGED_RULES_AND_TIMELINES_MSG'
  );
  const spyUpdatePrepackagedRulesAndTimelines = jest.spyOn(
    i18n,
    'UPDATE_PREPACKAGED_RULES_AND_TIMELINES'
  );

  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        docLinks: {
          ELASTIC_WEBSITE_URL: '',
          DOC_LINK_VERSION: '',
        },
      },
    });
  });

  beforeEach(() => {
    spyUpdatePrepackagedRulesMsg.mockClear();
    spyUpdatePrepackagedRules.mockClear();
    spyUpdatePrepackagedTimelinesMsg.mockClear();
    spyUpdatePrepackagedTimelines.mockClear();
    spyUpdatePrepackagedRulesAndTimelinesMsg.mockClear();
    spyUpdatePrepackagedRulesAndTimelines.mockClear();
  });

  it('renders correctly', () => {
    const wrapper = shallow(
      <UpdatePrePackagedRulesCallOut
        loading={false}
        numberOfUpdatedRules={0}
        numberOfUpdatedTimelines={0}
        updateRules={jest.fn()}
      />
    );

    expect(wrapper.find('EuiCallOut')).toHaveLength(1);
  });

  it('renders callOutMessage correctly: numberOfUpdatedRules > 0 and numberOfUpdatedTimelines = 0', () => {
    shallow(
      <UpdatePrePackagedRulesCallOut
        loading={false}
        numberOfUpdatedRules={1}
        numberOfUpdatedTimelines={0}
        updateRules={jest.fn()}
      />
    );

    expect(spyUpdatePrepackagedRulesMsg).toHaveBeenCalledWith(1);
  });

  it('renders buttonTitle correctly: numberOfUpdatedRules > 0 and numberOfUpdatedTimelines = 0', () => {
    shallow(
      <UpdatePrePackagedRulesCallOut
        loading={false}
        numberOfUpdatedRules={1}
        numberOfUpdatedTimelines={0}
        updateRules={jest.fn()}
      />
    );

    expect(spyUpdatePrepackagedRules).toHaveBeenCalledWith(1);
  });

  it('renders callOutMessage correctly: numberOfUpdatedRules = 0 and numberOfUpdatedTimelines > 0', () => {
    shallow(
      <UpdatePrePackagedRulesCallOut
        loading={false}
        numberOfUpdatedRules={0}
        numberOfUpdatedTimelines={1}
        updateRules={jest.fn()}
      />
    );

    expect(spyUpdatePrepackagedTimelinesMsg).toHaveBeenCalledWith(1);
  });

  it('renders buttonTitle correctly: numberOfUpdatedRules = 0 and numberOfUpdatedTimelines > 0', () => {
    shallow(
      <UpdatePrePackagedRulesCallOut
        loading={false}
        numberOfUpdatedRules={0}
        numberOfUpdatedTimelines={1}
        updateRules={jest.fn()}
      />
    );

    expect(spyUpdatePrepackagedTimelines).toHaveBeenCalledWith(1);
  });

  it('renders callOutMessage correctly: numberOfUpdatedRules > 0 and numberOfUpdatedTimelines > 0', () => {
    shallow(
      <UpdatePrePackagedRulesCallOut
        loading={false}
        numberOfUpdatedRules={1}
        numberOfUpdatedTimelines={1}
        updateRules={jest.fn()}
      />
    );

    expect(spyUpdatePrepackagedRulesAndTimelinesMsg).toHaveBeenCalledWith(1, 1);
  });

  it('renders buttonTitle correctly: numberOfUpdatedRules > 0 and numberOfUpdatedTimelines > 0', () => {
    shallow(
      <UpdatePrePackagedRulesCallOut
        loading={false}
        numberOfUpdatedRules={1}
        numberOfUpdatedTimelines={1}
        updateRules={jest.fn()}
      />
    );

    expect(spyUpdatePrepackagedRulesAndTimelines).toHaveBeenCalledWith(1, 1);
  });
});
