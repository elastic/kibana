/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiCode, type EuiTourStepProps } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EXPAND_DETAILS_BUTTON_TEST_ID } from '../../../shared/components/test_ids';
import { OVERVIEW_TAB_LABEL_TEST_ID } from '../../right/test_ids';
import { RULE_SUMMARY_BUTTON_TEST_ID } from '../../right/components/test_ids';
import {
  INSIGHTS_TAB_PREVALENCE_BUTTON_LABEL_TEST_ID,
  INSIGHTS_TAB_ENTITIES_BUTTON_LABEL_TEST_ID,
} from '../../left/tabs/test_ids';

export const FLYOUT_TOUR_CONFIG_ANCHORS = {
  OVERVIEW_TAB: OVERVIEW_TAB_LABEL_TEST_ID,
  RULE_PREVIEW: RULE_SUMMARY_BUTTON_TEST_ID,
  EXPAND_BUTTON: EXPAND_DETAILS_BUTTON_TEST_ID,
  ENTITIES: INSIGHTS_TAB_ENTITIES_BUTTON_LABEL_TEST_ID,
  PREVALENCE: INSIGHTS_TAB_PREVALENCE_BUTTON_LABEL_TEST_ID,
};

export interface TourState {
  /**
   * The current step number
   */
  currentTourStep: number;
  /**
   * True if tour is active (user has not completed or exited the tour)
   */
  isTourActive: boolean;
}

export const tourConfig: TourState = {
  currentTourStep: 1,
  isTourActive: true,
};

export interface FlyoutTourStepsProps {
  /**
   * Title of the tour step
   */
  title: string;
  /**
   * Content of tour step
   */
  content: JSX.Element;
  /**
   * Step number
   */
  stepNumber: number;
  /**
   * Data test subject of the anchor component
   */
  anchor: string;
  /**
   * Optional anchor position prop
   */
  anchorPosition?: EuiTourStepProps['anchorPosition'];
}

export const getRightSectionTourSteps = (): FlyoutTourStepsProps[] => {
  const rightSectionTourSteps: FlyoutTourStepsProps[] = [
    {
      title: i18n.translate('xpack.securitySolution.flyout.tour.overview.title', {
        defaultMessage: 'A more detailed overview of the alert',
      }),
      content: (
        <EuiText>
          <FormattedMessage
            id="xpack.securitySolution.flyout.tour.overview.description"
            defaultMessage="Explore sections on the {overview} tab to quickly build an understanding of the alert."
            values={{
              overview: (
                <EuiCode>
                  {i18n.translate('xpack.securitySolution.flyout.tour.overview.text', {
                    defaultMessage: 'Overview',
                  })}
                </EuiCode>
              ),
            }}
          />
        </EuiText>
      ),
      stepNumber: 1,
      anchor: FLYOUT_TOUR_CONFIG_ANCHORS.OVERVIEW_TAB,
      anchorPosition: 'downCenter',
    },
    {
      title: i18n.translate('xpack.securitySolution.flyout.tour.preview.title', {
        defaultMessage: 'An easier way to access rule details',
      }),
      content: (
        <EuiText>
          <FormattedMessage
            id="xpack.securitySolution.flyout.tour.rulePreview.description"
            defaultMessage="Click {rulePreview} to see a preview of the rule"
            values={{
              rulePreview: (
                <EuiCode>
                  {i18n.translate('xpack.securitySolution.flyout.tour.rulePreview.text', {
                    defaultMessage: 'Show rule summary',
                  })}
                </EuiCode>
              ),
            }}
          />
        </EuiText>
      ),
      stepNumber: 2,
      anchor: FLYOUT_TOUR_CONFIG_ANCHORS.RULE_PREVIEW,
      anchorPosition: 'rightUp',
    },
    {
      title: i18n.translate('xpack.securitySolution.flyout.tour.expandDetails.title', {
        defaultMessage: 'Flyout is now expandable',
      }),
      content: (
        <EuiText>
          <FormattedMessage
            id="xpack.securitySolution.flyout.tour.expandDetails.description"
            defaultMessage="Click to expand or collapse the expanded details"
          />
        </EuiText>
      ),
      stepNumber: 3,
      anchor: FLYOUT_TOUR_CONFIG_ANCHORS.EXPAND_BUTTON,
      anchorPosition: 'downCenter',
    },
  ];
  return rightSectionTourSteps;
};

export const getLeftSectionTourSteps = (): FlyoutTourStepsProps[] => {
  return [
    {
      title: i18n.translate('xpack.securitySolution.flyout.tour.entities.title', {
        defaultMessage: 'New insights are available',
      }),
      content: (
        <EuiText>
          <FormattedMessage
            id="xpack.securitySolution.flyout.tour.entities.description"
            defaultMessage="Host and user information are in {entities}."
            values={{
              entities: (
                <EuiCode>
                  {i18n.translate('xpack.securitySolution.flyout.tour.entities.text', {
                    defaultMessage: 'Entities',
                  })}
                </EuiCode>
              ),
            }}
          />
        </EuiText>
      ),
      stepNumber: 4,
      anchor: FLYOUT_TOUR_CONFIG_ANCHORS.ENTITIES,
      anchorPosition: 'rightUp',
    },
    {
      title: i18n.translate('xpack.securitySolution.flyout.tour.prevalence.title', {
        defaultMessage: 'New insights are available',
      }),
      content: (
        <EuiText>
          <FormattedMessage
            id="xpack.securitySolution.flyout.tour.prevalence.description"
            defaultMessage="See host and user prevalence in {prevalence}."
            values={{
              prevalence: (
                <EuiCode>
                  {i18n.translate('xpack.securitySolution.flyout.tour.prevalence.text', {
                    defaultMessage: 'Prevalence',
                  })}
                </EuiCode>
              ),
            }}
          />
        </EuiText>
      ),
      stepNumber: 5,
      anchor: FLYOUT_TOUR_CONFIG_ANCHORS.PREVALENCE,
      anchorPosition: 'rightUp',
    },
  ];
};
