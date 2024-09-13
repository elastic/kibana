/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PolicyFromES } from '../common/types';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import { PolicyListContextProvider } from '../public/application/sections/policy_list/policy_list_context';
import React, { ReactElement } from 'react';
import { ViewPolicyFlyout } from '../public/application/sections/policy_list/policy_flyout';
import * as readOnlyHook from '../public/application/lib/use_is_read_only';
import { policyAllPhases } from './mocks';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject, takeMountedSnapshot } from '@elastic/eui/lib/test';

let component: ReactElement;
const TestComponent = ({ policy }: { policy: PolicyFromES }) => {
  return (
    <KibanaContextProvider
      services={{ getUrlForApp: () => '', docLinks: docLinksServiceMock.createStartContract() }}
    >
      <PolicyListContextProvider>
        <ViewPolicyFlyout policy={policy} />
      </PolicyListContextProvider>
    </KibanaContextProvider>
  );
};

describe('View policy flyout', () => {
  beforeAll(() => {
    jest.spyOn(readOnlyHook, 'useIsReadOnly').mockReturnValue(false);
    component = <TestComponent policy={policyAllPhases} />;
  });
  it('shows all phases', () => {
    const rendered = mountWithIntl(component);
    expect(takeMountedSnapshot(rendered)).toMatchSnapshot();
  });

  it('renders manage button', () => {
    const rendered = mountWithIntl(component);
    const button = findTestSubject(rendered, 'managePolicyButton');
    expect(button.exists()).toBeTruthy();
  });

  it(`doesn't render manage button in read only view`, () => {
    jest.spyOn(readOnlyHook, 'useIsReadOnly').mockReturnValue(true);
    component = <TestComponent policy={policyAllPhases} />;
    const rendered = mountWithIntl(component);
    const button = findTestSubject(rendered, 'managePolicyButton');
    expect(button.exists()).toBeFalsy();
  });
});
