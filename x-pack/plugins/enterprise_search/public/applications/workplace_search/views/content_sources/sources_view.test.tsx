/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiModal } from '@elastic/eui';

import { Loading } from '../../../shared/loading';

import { SourcesView } from './sources_view';

describe('SourcesView', () => {
  const resetPermissionsModal = jest.fn();
  const permissionsModal = {
    addedSourceName: 'mySource',
    serviceType: 'jira',
    additionalConfiguration: true,
  };

  const mockValues = {
    permissionsModal,
    dataLoading: false,
  };

  const children = <p data-test-subj="TestChildren">test</p>;

  beforeEach(() => {
    setMockActions({
      resetPermissionsModal,
    });
    setMockValues({ ...mockValues });
  });

  it('renders', () => {
    const wrapper = shallow(<SourcesView>{children}</SourcesView>);

    expect(wrapper.find('PermissionsModal')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="TestChildren"]')).toHaveLength(1);
  });

  it('returns loading when loading', () => {
    setMockValues({ ...mockValues, dataLoading: true });
    const wrapper = shallow(<SourcesView>{children}</SourcesView>);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('calls function on modal close', () => {
    const wrapper = shallow(<SourcesView>{children}</SourcesView>);
    const modal = wrapper.find('PermissionsModal').dive().find(EuiModal);
    modal.prop('onClose')();

    expect(resetPermissionsModal).toHaveBeenCalled();
  });
});
