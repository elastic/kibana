/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { screen, render } from '@testing-library/react';

import { shallow } from 'enzyme';

import { EuiCallOut, EuiPanel, EuiSwitch } from '@elastic/eui';

import { I18nProvider } from '@kbn/i18n-react';

import { DocumentPermissionsField } from './document_permissions_field';

describe('DocumentPermissionsField', () => {
  const setValue = jest.fn();

  const props = {
    needsPermissions: true,
    indexPermissionsValue: true,
    setValue,
  };

  it('renders', () => {
    const wrapper = shallow(<DocumentPermissionsField {...props} />);

    expect(wrapper.find(EuiPanel)).toHaveLength(1);
  });

  it('renders doc-level permissions message when not available', () => {
    render(
      <I18nProvider>
        <DocumentPermissionsField {...props} needsPermissions={false} />
      </I18nProvider>
    );

    expect(screen.getByTestId('needsPermissionText')).toBeInTheDocument();
  });

  it('renders callout when not synced', () => {
    const wrapper = shallow(<DocumentPermissionsField {...props} indexPermissionsValue={false} />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });

  it('calls handler on click', () => {
    const wrapper = shallow(<DocumentPermissionsField {...props} />);
    wrapper.find(EuiSwitch).simulate('change', { target: { checked: true } });

    expect(setValue).toHaveBeenCalledWith(true);
  });
});
