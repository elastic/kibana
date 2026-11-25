/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getServiceGroupAriaLabel,
  getServiceGroupBoxAriaLabel,
  getServiceGroupMemberCountLabel,
} from './service_group_labels';

describe('service group labels', () => {
  it('counts the services of a group', () => {
    expect(getServiceGroupMemberCountLabel(1)).toBe('1 service');
    expect(getServiceGroupMemberCountLabel(3)).toBe('3 services');
  });

  it('names a closed group', () => {
    expect(getServiceGroupAriaLabel({ groupName: 'shop', memberCount: 2 })).toBe(
      'Service group: shop, 2 services'
    );
  });

  it('names the box of an open group and tells how to close it', () => {
    expect(getServiceGroupBoxAriaLabel({ groupName: 'shop', memberCount: 2 })).toBe(
      'Open service group: shop, 2 services. Press Enter or Escape to close the group.'
    );
  });
});
