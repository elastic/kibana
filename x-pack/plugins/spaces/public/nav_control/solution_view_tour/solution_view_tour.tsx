/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiLink, EuiText, EuiTourStep } from '@elastic/eui';
import React from 'react';
import type { FC, PropsWithChildren } from 'react';

import type { SolutionId } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { SolutionView } from '../../../common';
import { SOLUTION_VIEW_CLASSIC } from '../../../common/constants';

const tourLearnMoreLink = 'https://ela.st/left-nav';

const LearnMoreLink = () => (
  <EuiLink href={tourLearnMoreLink} target="_blank" external>
    {i18n.translate('xpack.spaces.navControl.tour.learnMore', {
      defaultMessage: 'Learn more',
    })}
  </EuiLink>
);

const solutionMap: Record<SolutionId, string> = {
  es: i18n.translate('xpack.spaces.navControl.tour.esSolution', {
    defaultMessage: 'Elasticsearch',
  }),
  security: i18n.translate('xpack.spaces.navControl.tour.securitySolution', {
    defaultMessage: 'Security',
  }),
  oblt: i18n.translate('xpack.spaces.navControl.tour.obltSolution', {
    defaultMessage: 'Observability',
  }),
};

interface Props extends PropsWithChildren<{}> {
  solution?: SolutionView;
  isTourOpen: boolean;
  onFinishTour: () => void;
}

export const SolutionViewTour: FC<Props> = ({ children, solution, isTourOpen, onFinishTour }) => {
  const solutionLabel = solution && solution !== SOLUTION_VIEW_CLASSIC ? solutionMap[solution] : '';
  if (!solutionLabel) {
    return children;
  }

  return (
    <EuiTourStep
      content={
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.spaces.navControl.tour.content"
              defaultMessage="It provides all the analytics and {solution} features you need. You can switch views or return to the classic navigation from your space settings, or create other spaces with different views. {learnMore}"
              values={{
                solution: solutionLabel,
                learnMore: <LearnMoreLink />,
              }}
            />
          </p>
        </EuiText>
      }
      isStepOpen={isTourOpen}
      minWidth={300}
      maxWidth={360}
      onFinish={onFinishTour}
      step={1}
      stepsTotal={1}
      title={i18n.translate('xpack.spaces.navControl.tour.title', {
        defaultMessage: 'You chose the {solution} solution view',
        values: { solution: solutionLabel },
      })}
      anchorPosition="downCenter"
      footerAction={
        <EuiButtonEmpty size="s" color="text" onClick={onFinishTour} data-test-subj="closeTourBtn">
          {i18n.translate('xpack.spaces.navControl.tour.closeBtn', {
            defaultMessage: 'Close',
          })}
        </EuiButtonEmpty>
      }
      panelProps={{
        'data-test-subj': 'spaceSolutionTour',
      }}
    >
      <>{children}</>
    </EuiTourStep>
  );
};
