/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { of } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { EuiText, EuiTourStep } from '@elastic/eui';
import { useKibana } from '../../lib/kibana';

// TODO: Make real translations
const translations = {
  alerts: {
    title: 'Test alert for practice',
    description:
      'To help you practice triaging alerts, we enabled a rule to create your first alert.',
  },
};
interface Props {
  children: React.ReactElement;
}
export const TourWrapper = (props: Props) => {
  const { guidedOnboardingApi } = useKibana().services.guidedOnboarding;

  const [isTourStepOpen, setIsTourStepOpen] = useState<boolean>(false);

  const isTourActive = useObservable(
    guidedOnboardingApi?.isGuideStepActive$('security', 'alerts') ?? of(false),
    false
  );
  useEffect(() => {
    setIsTourStepOpen(isTourActive);
  }, [isTourActive]);

  return (
    <EuiTourStep
      content={
        <EuiText>
          <p>{translations.alerts.description}</p>
        </EuiText>
      }
      isStepOpen={isTourStepOpen}
      minWidth={300}
      onFinish={() => setIsTourStepOpen(false)}
      step={1}
      stepsTotal={1}
      title={translations.alerts.title}
      anchorPosition="rightUp"
    >
      {props.children}
    </EuiTourStep>
  );
};
