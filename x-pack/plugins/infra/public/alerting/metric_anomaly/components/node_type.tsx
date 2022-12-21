/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiExpression, EuiPopover, EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import { EuiPopoverTitle, EuiButtonIcon } from '@elastic/eui';
import { MetricAnomalyParams } from '../../../../common/alerting/metrics';

type Node = MetricAnomalyParams['nodeType'];

interface WhenExpressionProps {
  value: Node;
  options: { [key: string]: { text: string; value: Node } };
  onChange: (value: Node) => void;
  popupPosition?:
    | 'upCenter'
    | 'upLeft'
    | 'upRight'
    | 'downCenter'
    | 'downLeft'
    | 'downRight'
    | 'leftCenter'
    | 'leftUp'
    | 'leftDown'
    | 'rightCenter'
    | 'rightUp'
    | 'rightDown';
}

export const NodeTypeExpression = ({
  value,
  options,
  onChange,
  popupPosition,
}: WhenExpressionProps) => {
  const [aggTypePopoverOpen, setAggTypePopoverOpen] = useState(false);

  return (
    <EuiPopover
      button={
        <EuiExpression
          data-test-subj="nodeTypeExpression"
          description={i18n.translate(
            'xpack.infra.metrics.alertFlyout.expression.for.descriptionLabel',
            {
              defaultMessage: 'For',
            }
          )}
          value={options[value].text}
          isActive={aggTypePopoverOpen}
          onClick={() => {
            setAggTypePopoverOpen(true);
          }}
        />
      }
      isOpen={aggTypePopoverOpen}
      closePopover={() => {
        setAggTypePopoverOpen(false);
      }}
      ownFocus
      anchorPosition={popupPosition ?? 'downLeft'}
    >
      <div>
        <ClosablePopoverTitle onClose={() => setAggTypePopoverOpen(false)}>
          <FormattedMessage
            id="xpack.infra.metrics.alertFlyout.expression.for.popoverTitle"
            defaultMessage="Node Type"
          />
        </ClosablePopoverTitle>
        <EuiSelect
          data-test-subj="forExpressionSelect"
          value={value}
          fullWidth
          onChange={(e) => {
            onChange(e.target.value as Node);
            setAggTypePopoverOpen(false);
          }}
          options={Object.values(options).map((o) => o)}
        />
      </div>
    </EuiPopover>
  );
};

interface ClosablePopoverTitleProps {
  children: JSX.Element;
  onClose: () => void;
}

export const ClosablePopoverTitle = ({ children, onClose }: ClosablePopoverTitleProps) => {
  return (
    <EuiPopoverTitle>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>{children}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="cross"
            color="danger"
            aria-label={i18n.translate(
              'xpack.infra.metrics.expressionItems.components.closablePopoverTitle.closeLabel',
              {
                defaultMessage: 'Close',
              }
            )}
            onClick={() => onClose()}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopoverTitle>
  );
};
