/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiSpacer, EuiText, EuiTourStep } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useLocalStorage } from '../../../hooks/use_local_storage';

type Type = 'createGroup' | 'editGroup' | 'serviceGroupCard';

interface Props {
  type: Type;
  title: string;
  content: string;
  children: React.ReactElement;
}

const LocalStorageTourEnabled: Record<Type, boolean> = {
  createGroup: true,
  editGroup: true,
  serviceGroupCard: true,
};

export function ServiceGroupsTour({ type, title, content, children }: Props) {
  const [tourEnabled, setTourEnabled] = useLocalStorage(
    'apm.serviceGroupsTour',
    LocalStorageTourEnabled
  );

  const tourIsOpen = tourEnabled[type];

  return (
    <EuiTourStep
      content={
        <>
          <EuiText size="s" color="subdued">
            {content}
          </EuiText>
          <EuiSpacer />
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.apm.serviceGroups.tour.content.link', {
              defaultMessage: 'Learn more in our documentation',
            })}
          </EuiText>
        </>
      }
      isStepOpen={tourIsOpen}
      onFinish={() => {}}
      maxWidth={300}
      minWidth={300}
      step={1}
      stepsTotal={1}
      title={title}
      anchorPosition="leftUp"
      footerAction={
        <EuiButtonEmpty
          onClick={() => {
            setTourEnabled({ ...tourEnabled, [type]: false });
          }}
        >
          Dismiss
        </EuiButtonEmpty>
      }
    >
      {children}
    </EuiTourStep>
  );
}
