/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { EuiEmptyPrompt, EuiPanel, EuiTable } from '@elastic/eui';

import { fullContentSources } from '../../../__mocks__/content_sources.mock';

import { Loading } from '../../../../shared/loading';
import { ComponentLoader } from '../../../components/shared/component_loader';

import { Overview } from './overview';

describe('Overview', () => {
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
  });

  it('renders', () => {
    const wrapper = shallow(<Overview />);
    const documentSummary = wrapper.find('[data-test-subj="DocumentSummary"]').dive();

    expect(documentSummary).toHaveLength(1);
    expect(documentSummary.find('[data-test-subj="DocumentSummaryRow"]')).toHaveLength(1);
  });

  it('returns Loading when loading', () => {
    setMockValues({ ...mockValues, dataLoading: true });
    const wrapper = shallow(<Overview />);

    expect(wrapper.find(Loading)).toHaveLength(1);
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
});
