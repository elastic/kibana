/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiText, EuiIcon, EuiToolTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

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
  isInvalid,
  hideTooltip,
  invalidMessage = defaultDimensionTriggerTooltip,
}: {
  label: string;
  id: string;
  isInvalid?: boolean;
  hideTooltip?: boolean;
  invalidMessage?: string | JSX.Element;
}) => {
  if (isInvalid) {
    return (
      <EuiToolTip content={!hideTooltip ? invalidMessage : null} anchorClassName="eui-displayBlock">
        <EuiText
          size="s"
          color="danger"
          id={id}
          className="lnsLayerPanel__triggerText"
          data-test-subj="lns-dimensionTrigger"
        >
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon size="s" type="alert" />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>{label}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiText>
      </EuiToolTip>
    );
  }

  return (
    <EuiText
      size="s"
      id={id}
      className="lnsLayerPanel__triggerText"
      data-test-subj="lns-dimensionTrigger"
    >
      <EuiFlexItem grow={true}>
        <span>
          <span className="lnsLayerPanel__triggerTextLabel">{label}</span>
        </span>
      </EuiFlexItem>
    </EuiText>
  );
};
