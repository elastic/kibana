/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiText, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiTextProps } from '@elastic/eui/src/components/text/text';

export const defaultDimensionTriggerTooltip = (
  <p>
    {i18n.translate('xpack.lens.configure.invalidConfigTooltip', {
      defaultMessage: 'Invalid configuration.',
    })}
    <br />
    {i18n.translate('xpack.lens.configure.invalidConfigTooltipClick', {
      defaultMessage: 'Click for more details.',
    })}
  </p>
);

export const DimensionTrigger = ({
  id,
  label,
  color,
  dataTestSubj,
}: {
  label: string;
  id: string;
  color?: EuiTextProps['color'];
  dataTestSubj?: string;
}) => {
  return (
    <EuiText
      size="s"
      id={id}
      color={color}
      className="lnsLayerPanel__triggerText"
      data-test-subj={dataTestSubj || 'lns-dimensionTrigger'}
    >
      <EuiFlexItem grow={true}>
        <span>
          <span className="lnsLayerPanel__triggerTextLabel">{label}</span>
        </span>
      </EuiFlexItem>
    </EuiText>
  );
};
