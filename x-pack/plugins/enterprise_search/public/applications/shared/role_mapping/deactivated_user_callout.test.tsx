/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { DeactivatedUserCallout } from '.';

describe('DeactivatedUserCallout', () => {
  it('renders with new', () => {
    const wrapper = shallow(<DeactivatedUserCallout isNew />);

    expect(wrapper).toMatchInlineSnapshot(`
      <Fragment>
        <EuiText
          size="s"
        >
          <EuiIcon
            color="warning"
            type="alert"
          />
           
          <strong>
            User deactivated
          </strong>
        </EuiText>
        <EuiSpacer
          size="xs"
        />
        <EuiText
          size="s"
        >
          This user is not currently active, and access has been temporarily revoked. Users can be re-activated via the User Management area of the Kibana console.
        </EuiText>
        <EuiSpacer />
      </Fragment>
    `);
  });

  it('renders with existing', () => {
    const wrapper = shallow(<DeactivatedUserCallout isNew={false} />);

    expect(wrapper).toMatchInlineSnapshot(`
      <Fragment>
        <EuiSpacer />
        <EuiText
          size="s"
        >
          <EuiIcon
            color="warning"
            type="alert"
          />
           
          <strong>
            User deactivated
          </strong>
        </EuiText>
        <EuiSpacer
          size="xs"
        />
        <EuiText
          size="s"
        >
          This user is not currently active, and access has been temporarily revoked. Users can be re-activated via the User Management area of the Kibana console.
        </EuiText>
        <EuiSpacer />
      </Fragment>
    `);
  });
});
