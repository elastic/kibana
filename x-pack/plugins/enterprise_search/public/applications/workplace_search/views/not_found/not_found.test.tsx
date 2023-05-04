/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { NotFoundPrompt } from '../../../shared/not_found';
import { SendWorkplaceSearchTelemetry } from '../../../shared/telemetry';
import { WorkplaceSearchPageTemplate, PersonalDashboardLayout } from '../../components/layout';

import { NotFound } from '.';

describe('NotFound', () => {
  it('renders the shared not found prompt', () => {
    const wrapper = shallow(<NotFound />);
    expect(wrapper.find(NotFoundPrompt)).toHaveLength(1);
  });

  it('renders a telemetry error event', () => {
    const wrapper = shallow(<NotFound />);
    expect(wrapper.find(SendWorkplaceSearchTelemetry).prop('action')).toEqual('error');
  });

  it('passes optional preceding page chrome', () => {
    const wrapper = shallow(<NotFound pageChrome={['Sources']} />);
    expect(wrapper.prop('pageChrome')).toEqual(['Sources', '404']);
  });

  describe('organization views', () => {
    it('renders the WorkplaceSearchPageTemplate', () => {
      const wrapper = shallow(<NotFound isOrganization />);
      expect(wrapper.type()).toEqual(WorkplaceSearchPageTemplate);
    });
  });

  describe('personal views', () => {
    it('renders the PersonalDashboardLayout', () => {
      const wrapper = shallow(<NotFound isOrganization={false} />);
      expect(wrapper.type()).toEqual(PersonalDashboardLayout);
    });

    it('sets the "Back to dashboard" link to /p/sources', () => {
      const wrapper = shallow(<NotFound isOrganization={false} />);
      expect(wrapper.find(NotFoundPrompt).prop('backToLink')).toEqual('/p/sources');
    });
  });
});
