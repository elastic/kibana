/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StepContent } from './step_content';
import { AddAndValidateYourDataCardsId, SectionId } from '../types';
import { viewDashboardSteps } from '../sections';
import { mountWithIntl } from '@kbn/test-jest-helpers';

jest.mock('../context/step_context');
jest.mock('@kbn/security-solution-navigation/src/context');
jest.mock('../../../../lib/kibana', () => ({
  useKibana: () => ({
    services: {
      notifications: {
        toasts: {
          addError: jest.fn(),
        },
      },
    },
  }),
}));

describe('StepContent', () => {
  const toggleTaskCompleteStatus = jest.fn();

  const props = {
    cardId: AddAndValidateYourDataCardsId.viewDashboards,
    indicesExist: false,
    sectionId: SectionId.addAndValidateYourData,
    step: viewDashboardSteps[0],
    toggleTaskCompleteStatus,
  };

  it('renders step content when hasStepContent is true and isExpandedStep is true', () => {
    const mockProps = { ...props, hasStepContent: true, isExpandedStep: true };
    const wrapper = mountWithIntl(<StepContent {...mockProps} />);

    const splitPanelElement = wrapper.find('[data-test-subj="split-panel"]');

    expect(splitPanelElement.exists()).toBe(true);

    expect(
      wrapper
        .text()
        .includes(
          'Use dashboards to visualize data and stay up-to-date with key information. Create your own, or use Elastic’s default dashboards — including alerts, user authentication events, known vulnerabilities, and more.'
        )
    ).toBe(true);
  });
});
