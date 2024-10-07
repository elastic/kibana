/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiLink, EuiText, EuiTourStep } from '@elastic/eui';
import React from 'react';
import type { FC, PropsWithChildren } from 'react';

import { i18n } from '@kbn/i18n';

import type { SolutionView } from '../../../common';

const tourLearnMoreLink = 'https://ela.st/left-nav';

interface Props extends PropsWithChildren<{}> {
  solution?: SolutionView;
  isTourOpen: boolean;
  onFinishTour: () => void;
}

export const SolutionViewTour: FC<Props> = ({ children, solution, isTourOpen, onFinishTour }) => {
  const tourTexts = getTourTexts(solution);

  return (
    <EuiTourStep
      content={
        <EuiText>
          <p>{tourTexts.content}</p>
          <p>
            <EuiLink href={tourLearnMoreLink} target="_blank" external>
              {tourTexts.learnMore}
            </EuiLink>
          </p>
        </EuiText>
      }
      isStepOpen={isTourOpen}
      minWidth={300}
      maxWidth={360}
      onFinish={onFinishTour}
      step={1}
      stepsTotal={1}
      title={tourTexts.title}
      anchorPosition="downCenter"
      footerAction={
        <EuiButtonEmpty size="s" color="text" onClick={onFinishTour} data-test-subj="closeTourBtn">
          {tourTexts.closeBtn}
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

function getTourTexts(solution?: SolutionView) {
  const solutionMap: Record<SolutionView, string> = {
    es: i18n.translate('xpack.spaces.navControl.tour.esSolution', {
      defaultMessage: 'Search',
    }),
    security: i18n.translate('xpack.spaces.navControl.tour.securitySolution', {
      defaultMessage: 'Security',
    }),
    oblt: i18n.translate('xpack.spaces.navControl.tour.obltSolution', {
      defaultMessage: 'Observability',
    }),
    classic: '', // Tour is not shown for the classic solution
  };

  const title = !!solution
    ? i18n.translate('xpack.spaces.navControl.tour.title', {
        defaultMessage: 'You chose the {solution} solution view',
        values: { solution: solutionMap[solution] },
      })
    : '';

  const content = !!solution
    ? i18n.translate('xpack.spaces.navControl.tour.content', {
        defaultMessage:
          'It provides all the analytics and {solution} features you need. You can switch views or return to the classic navigation from your space settings, or create other spaces with different views.',
        values: { solution: solutionMap[solution] },
      })
    : '';

  return {
    title,
    content,
    closeBtn: i18n.translate('xpack.spaces.navControl.tour.closeBtn', {
      defaultMessage: 'Close',
    }),
    learnMore: i18n.translate('xpack.spaces.navControl.tour.learnMore', {
      defaultMessage: 'Learn more',
    }),
  };
}
