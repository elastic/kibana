/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallowWithIntl } from '@kbn/test-jest-helpers';

import { SectionLoading } from './section_loading';

describe('SectionLoading', () => {
  it('renders the default loading message', () => {
    const wrapper = shallowWithIntl(<SectionLoading />);
    expect(wrapper.props().body).toMatchInlineSnapshot(`
      <EuiText
        color="subdued"
      >
        <FormattedMessage
          defaultMessage="Loading…"
          id="xpack.security.management.editRoleMapping.loadingRoleMappingDescription"
          values={Object {}}
        />
      </EuiText>
    `);
  });

  it('renders the custom message when provided', () => {
    const custom = <div>hold your horses</div>;
    const wrapper = shallowWithIntl(<SectionLoading>{custom}</SectionLoading>);
    expect(wrapper.props().body).toMatchInlineSnapshot(`
      <EuiText
        color="subdued"
      >
        <div>
          hold your horses
        </div>
      </EuiText>
    `);
  });
});
