/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer } from '@elastic/eui';
import { TRANSFORM_FUNCTION, TransformFunction } from '../../../../../../common/constants';

interface TransformFunctionSelectorProps {
  selectedFunction: TransformFunction;
  onChange: (update: TransformFunction) => void;
}

export const TransformFunctionSelector: FC<TransformFunctionSelectorProps> = ({
  selectedFunction,
  onChange,
}) => {
  const transformFunctions = [
    {
      name: TRANSFORM_FUNCTION.PIVOT,
      helpText: i18n.translate('xpack.transform.stepDefineForm.pivotHelperText', {
        defaultMessage: 'Aggregate and group your data.',
      }),
      icon: 'aggregate',
      title: i18n.translate('xpack.transform.stepDefineForm.pivotLabel', {
        defaultMessage: 'Pivot',
      }),
    },
    {
      name: TRANSFORM_FUNCTION.LATEST,
      helpText: i18n.translate('xpack.transform.stepDefineForm.latestHelperText', {
        defaultMessage: 'Keep track of your most recent data.',
      }),
      icon: 'clock',
      title: i18n.translate('xpack.transform.stepDefineForm.latestLabel', {
        defaultMessage: 'Latest',
      }),
    },
  ];

  return (
    <>
      <EuiFlexGroup gutterSize="m" data-test-subj="transformFunctionSelection">
        {transformFunctions.map(({ helpText, icon, name, title }) => (
          <EuiFlexItem key={name} style={{ width: 320 }} grow={false}>
            <EuiCard
              icon={<EuiIcon size="xl" type={icon} />}
              title={title}
              description={helpText}
              data-test-subj={`transformCreation-${name}-option${
                selectedFunction === name ? ' selectedFunction' : ''
              }`}
              selectable={{
                onClick: () => {
                  // Only allow one function selected at a time and don't allow deselection
                  if (selectedFunction === name) {
                    return;
                  }
                  onChange(name);
                },
                isSelected: selectedFunction === name,
              }}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
};
