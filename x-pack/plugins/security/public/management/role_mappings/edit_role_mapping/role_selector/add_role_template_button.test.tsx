/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';

import { AddRoleTemplateButton } from './add_role_template_button';

describe('AddRoleTemplateButton', () => {
  it('renders a warning instead of a button if all script types are disabled', () => {
    const wrapper = shallowWithIntl(
      <AddRoleTemplateButton
        onClick={jest.fn()}
        canUseInlineScripts={false}
        canUseStoredScripts={false}
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <EuiCallOut
        color="danger"
        iconType="alert"
        title={
          <FormattedMessage
            defaultMessage="Role templates unavailable"
            id="xpack.security.management.editRoleMapping.roleTemplatesUnavailableTitle"
            values={Object {}}
          />
        }
      >
        <p>
          <FormattedMessage
            defaultMessage="Role templates cannot be used when scripts are disabled in Elasticsearch."
            id="xpack.security.management.editRoleMapping.roleTemplatesUnavailable"
            values={Object {}}
          />
        </p>
      </EuiCallOut>
    `);
  });

  it(`asks for an inline template to be created if both script types are enabled`, () => {
    const onClickHandler = jest.fn();
    const wrapper = mountWithIntl(
      <AddRoleTemplateButton
        onClick={onClickHandler}
        canUseInlineScripts={true}
        canUseStoredScripts={true}
      />
    );
    wrapper.simulate('click');
    expect(onClickHandler).toHaveBeenCalledTimes(1);
    expect(onClickHandler).toHaveBeenCalledWith('inline');
  });

  it(`asks for a stored template to be created if inline scripts are disabled`, () => {
    const onClickHandler = jest.fn();
    const wrapper = mountWithIntl(
      <AddRoleTemplateButton
        onClick={onClickHandler}
        canUseInlineScripts={false}
        canUseStoredScripts={true}
      />
    );
    wrapper.simulate('click');
    expect(onClickHandler).toHaveBeenCalledTimes(1);
    expect(onClickHandler).toHaveBeenCalledWith('stored');
  });
});
