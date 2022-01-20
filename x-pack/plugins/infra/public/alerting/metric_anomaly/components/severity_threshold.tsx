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
import { ANOMALY_THRESHOLD } from '../../../../common/infra_ml';

interface WhenExpressionProps {
  value: Exclude<ANOMALY_THRESHOLD, ANOMALY_THRESHOLD.LOW>;
  onChange: (value: ANOMALY_THRESHOLD) => void;
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

const options = {
  [ANOMALY_THRESHOLD.CRITICAL]: {
    text: i18n.translate('xpack.infra.metrics.alertFlyout.expression.severityScore.criticalLabel', {
      defaultMessage: 'Critical',
    }),
    value: ANOMALY_THRESHOLD.CRITICAL,
  },
  [ANOMALY_THRESHOLD.MAJOR]: {
    text: i18n.translate('xpack.infra.metrics.alertFlyout.expression.severityScore.majorLabel', {
      defaultMessage: 'Major',
    }),
    value: ANOMALY_THRESHOLD.MAJOR,
  },
  [ANOMALY_THRESHOLD.MINOR]: {
    text: i18n.translate('xpack.infra.metrics.alertFlyout.expression.severityScore.minorLabel', {
      defaultMessage: 'Minor',
    }),
    value: ANOMALY_THRESHOLD.MINOR,
  },
  [ANOMALY_THRESHOLD.WARNING]: {
    text: i18n.translate('xpack.infra.metrics.alertFlyout.expression.severityScore.warningLabel', {
      defaultMessage: 'Warning',
    }),
    value: ANOMALY_THRESHOLD.WARNING,
  },
};

export const SeverityThresholdExpression = ({
  value,
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
            'xpack.infra.metrics.alertFlyout.expression.severityScore.descriptionLabel',
            {
              defaultMessage: 'Severity score is above',
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
            id="xpack.infra.metrics.alertFlyout.expression.severityScore.popoverTitle"
            defaultMessage="Severity Score"
          />
        </ClosablePopoverTitle>
        <EuiSelect
          data-test-subj="severityExpressionSelect"
          value={value}
          fullWidth
          onChange={(e) => {
            onChange(Number(e.target.value) as ANOMALY_THRESHOLD);
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
