/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { EuiToken, EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { getJobTypeAriaLabel } from '../../util/field_types_utils';
import { JOB_FIELD_TYPES } from '../../../../../common';
import type { JobFieldType } from '../../../../../common';

interface FieldTypeIconProps {
  tooltipEnabled: boolean;
  type: JobFieldType;
  fieldName?: string;
  needsAria: boolean;
}

interface FieldTypeIconContainerProps {
  ariaLabel: string | null;
  iconType: string;
  color: string;
  needsAria: boolean;
  [key: string]: any;
}

export const FieldTypeIcon: FC<FieldTypeIconProps> = ({
  tooltipEnabled = false,
  type,
  fieldName,
  needsAria = true,
}) => {
  const ariaLabel = getJobTypeAriaLabel(type);

  let iconType = 'questionInCircle';
  let color = 'euiColorVis6';

  switch (type) {
    // Set icon types and colors
    case JOB_FIELD_TYPES.BOOLEAN:
      iconType = 'tokenBoolean';
      color = 'euiColorVis5';
      break;
    case JOB_FIELD_TYPES.DATE:
      iconType = 'tokenDate';
      color = 'euiColorVis7';
      break;
    case JOB_FIELD_TYPES.GEO_POINT:
    case JOB_FIELD_TYPES.GEO_SHAPE:
      iconType = 'tokenGeo';
      color = 'euiColorVis8';
      break;
    case JOB_FIELD_TYPES.TEXT:
      iconType = 'document';
      color = 'euiColorVis9';
      break;
    case JOB_FIELD_TYPES.IP:
      iconType = 'tokenIP';
      color = 'euiColorVis3';
      break;
    case JOB_FIELD_TYPES.KEYWORD:
      iconType = 'tokenText';
      color = 'euiColorVis0';
      break;
    case JOB_FIELD_TYPES.NUMBER:
      iconType = 'tokenNumber';
      color = fieldName !== undefined ? 'euiColorVis1' : 'euiColorVis2';
      break;
    case JOB_FIELD_TYPES.UNKNOWN:
      // Use defaults
      break;
  }

  const containerProps = {
    ariaLabel,
    iconType,
    color,
    needsAria,
  };

  if (tooltipEnabled === true) {
    // wrap the inner component inside <span> because EuiToolTip doesn't seem
    // to support having another component directly inside the tooltip anchor
    // see https://github.com/elastic/eui/issues/839
    return (
      <EuiToolTip
        position="left"
        content={i18n.translate('xpack.dataVisualizer.fieldTypeIcon.fieldTypeTooltip', {
          defaultMessage: '{type} type',
          values: { type },
        })}
      >
        <FieldTypeIconContainer {...containerProps} />
      </EuiToolTip>
    );
  }

  return <FieldTypeIconContainer {...containerProps} />;
};

// If the tooltip is used, it will apply its events to its first inner child.
// To pass on its properties we apply `rest` to the outer `span` element.
const FieldTypeIconContainer: FC<FieldTypeIconContainerProps> = ({
  ariaLabel,
  iconType,
  color,
  needsAria,
  ...rest
}) => {
  const wrapperProps: { className: string; 'aria-label'?: string } = {
    className: 'field-type-icon',
  };
  if (needsAria && ariaLabel) {
    wrapperProps['aria-label'] = ariaLabel;
  }

  return (
    <span data-test-subj="fieldTypeIcon" {...rest}>
      <span {...wrapperProps}>
        <EuiToken iconType={iconType} shape="square" size="s" color={color} />
      </span>
    </span>
  );
};
