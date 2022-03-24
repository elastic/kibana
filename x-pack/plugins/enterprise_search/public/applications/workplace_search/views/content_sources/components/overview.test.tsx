/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';
import { fullContentSources } from '../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut, EuiConfirmModal, EuiEmptyPrompt, EuiPanel, EuiTable } from '@elastic/eui';

import { ComponentLoader } from '../../../components/shared/component_loader';

import { Overview } from './overview';

describe('Overview', () => {
  const initializeSourceSynchronization = jest.fn();
  const contentSource = fullContentSources[0];
  const dataLoading = false;
  const isOrganization = true;

  const mockValues = {
    contentSource,
    dataLoading,
    isOrganization,
  };

  beforeEach(() => {
    setMockValues({ ...mockValues });
    setMockActions({ initializeSourceSynchronization });
  });

  it('renders', () => {
    const wrapper = shallow(<Overview />);
    const documentSummary = wrapper.find('[data-test-subj="DocumentSummary"]').dive();

    expect(documentSummary).toHaveLength(1);
    expect(documentSummary.find('[data-test-subj="DocumentSummaryRow"]')).toHaveLength(1);
  });

  it('renders ComponentLoader when loading', () => {
    setMockValues({
      ...mockValues,
      contentSource: {
        ...fullContentSources[1],
        summary: null,
      },
    });

    const wrapper = shallow(<Overview />);
    const documentSummary = wrapper.find('[data-test-subj="DocumentSummary"]').dive();

    expect(documentSummary.find(ComponentLoader)).toHaveLength(1);
  });

  it('handles empty states', () => {
    setMockValues({ ...mockValues, contentSource: fullContentSources[1] });
    const wrapper = shallow(<Overview />);
    const documentSummary = wrapper.find('[data-test-subj="DocumentSummary"]').dive();
    const activitySummary = wrapper.find('[data-test-subj="ActivitySummary"]').dive();

    expect(documentSummary.find(EuiEmptyPrompt)).toHaveLength(1);
    expect(activitySummary.find(EuiEmptyPrompt)).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="GroupsSummary"]')).toHaveLength(0);
  });

  it('renders activity table', () => {
    const wrapper = shallow(<Overview />);
    const activitySummary = wrapper.find('[data-test-subj="ActivitySummary"]').dive();

    expect(activitySummary.find(EuiTable)).toHaveLength(1);
  });

  it('renders GroupsSummary', () => {
    const wrapper = shallow(<Overview />);
    const groupsSummary = wrapper.find('[data-test-subj="GroupsSummary"]').dive();

    expect(groupsSummary.find('[data-test-subj="SourceGroupLink"]')).toHaveLength(1);
  });

  it('renders DocumentationCallout', () => {
    setMockValues({ ...mockValues, contentSource: fullContentSources[1] });
    const wrapper = shallow(<Overview />);
    const documentationCallout = wrapper.find('[data-test-subj="DocumentationCallout"]').dive();

    expect(documentationCallout.find(EuiPanel)).toHaveLength(1);
  });

  it('renders PermissionsStatus', () => {
    setMockValues({
      ...mockValues,
      contentSource: {
        ...fullContentSources[0],
        serviceTypeSupportsPermissions: true,
        hasPermissions: false,
      },
    });

    const wrapper = shallow(<Overview />);

    expect(wrapper.find('[data-test-subj="PermissionsStatus"]')).toHaveLength(1);
  });

  it('renders DocumentPermissionsDisabled', () => {
    setMockValues({
      ...mockValues,
      contentSource: {
        ...fullContentSources[1],
        serviceTypeSupportsPermissions: true,
        custom: false,
      },
    });

    const wrapper = shallow(<Overview />);

    expect(wrapper.find('[data-test-subj="DocumentPermissionsDisabled"]')).toHaveLength(1);
  });

  it('renders feedback callout for external sources', () => {
    setMockValues({
      ...mockValues,
      contentSource: {
        ...fullContentSources[1],
        serviceTypeSupportsPermissions: true,
        custom: false,
        serviceType: 'external',
      },
    });

    const wrapper = shallow(<Overview />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });

  it('handles confirmModal submission', () => {
    const wrapper = shallow(<Overview />);
    const button = wrapper.find('[data-test-subj="SyncButton"]');
    button.prop('onClick')!({} as any);
    const modal = wrapper.find(EuiConfirmModal);
    modal.prop('onConfirm')!({} as any);

    expect(initializeSourceSynchronization).toHaveBeenCalled();
  });
});
