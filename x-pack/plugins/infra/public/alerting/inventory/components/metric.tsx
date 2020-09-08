/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiExpression,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiComboBox,
} from '@elastic/eui';
import { EuiPopoverTitle, EuiButtonIcon } from '@elastic/eui';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IErrorObject } from '../../../../../triggers_actions_ui/public/types';

interface Props {
  metric?: { value: string; text: string };
  metrics: Array<{ value: string; text: string }>;
  errors: IErrorObject;
  onChange: (metric?: string) => void;
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

export const MetricExpression = ({ metric, metrics, errors, onChange, popupPosition }: Props) => {
  const [aggFieldPopoverOpen, setAggFieldPopoverOpen] = useState(false);
  const firstFieldOption = {
    text: i18n.translate('xpack.infra.metrics.alertFlyout.expression.metric.selectFieldLabel', {
      defaultMessage: 'Select a metric',
    }),
    value: '',
  };

  const availablefieldsOptions = metrics.map((m) => {
    return { label: m.text, value: m.value };
  }, []);

  return (
    <EuiPopover
      id="aggFieldPopover"
      button={
        <EuiExpression
          description={i18n.translate(
            'xpack.infra.metrics.alertFlyout.expression.metric.whenLabel',
            {
              defaultMessage: 'When',
            }
          )}
          value={metric?.text || firstFieldOption.text}
          isActive={Boolean(aggFieldPopoverOpen || (errors.metric && errors.metric.length > 0))}
          onClick={() => {
            setAggFieldPopoverOpen(true);
          }}
          color={errors.metric?.length ? 'danger' : 'secondary'}
        />
      }
      isOpen={aggFieldPopoverOpen}
      closePopover={() => {
        setAggFieldPopoverOpen(false);
      }}
      withTitle
      anchorPosition={popupPosition ?? 'downRight'}
      zIndex={8000}
    >
      <div>
        <ClosablePopoverTitle onClose={() => setAggFieldPopoverOpen(false)}>
          <FormattedMessage
            id="xpack.infra.metrics.alertFlyout.expression.metric.popoverTitle"
            defaultMessage="Metric"
          />
        </ClosablePopoverTitle>
        <EuiFlexGroup>
          <EuiFlexItem grow={false} className="actOf__aggFieldContainer">
            <EuiFormRow fullWidth isInvalid={errors.metric.length > 0} error={errors.metric}>
              <EuiComboBox
                fullWidth
                singleSelection={{ asPlainText: true }}
                data-test-subj="availablefieldsOptionsComboBox"
                isInvalid={errors.metric.length > 0}
                placeholder={firstFieldOption.text}
                options={availablefieldsOptions}
                noSuggestions={!availablefieldsOptions.length}
                selectedOptions={
                  metric ? availablefieldsOptions.filter((a) => a.value === metric.value) : []
                }
                renderOption={(o: any) => o.label}
                onChange={(selectedOptions) => {
                  if (selectedOptions.length > 0) {
                    onChange(selectedOptions[0].value);
                    setAggFieldPopoverOpen(false);
                  } else {
                    onChange();
                  }
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
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
