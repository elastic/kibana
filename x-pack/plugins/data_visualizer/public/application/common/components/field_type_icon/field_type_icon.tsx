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
import type { JobFieldType } from '../../../../../common';

interface FieldTypeIconProps {
  tooltipEnabled: boolean;
  type: JobFieldType;
  needsAria: boolean;
}

interface FieldTypeIconContainerProps {
  ariaLabel: string | null;
  iconType: string;
  color?: string;
  needsAria: boolean;
  [key: string]: any;
}

// defaultIcon => a unknown datatype
const defaultIcon = { iconType: 'questionInCircle', color: 'gray' };

// Extended & modified version of src/plugins/kibana_react/public/field_icon/field_icon.tsx
export const typeToEuiIconMap: Record<string, { iconType: string; color?: string }> = {
  boolean: { iconType: 'tokenBoolean' },
  // icon for an index pattern mapping conflict in discover
  conflict: { iconType: 'alert', color: 'euiColorVis9' },
  date: { iconType: 'tokenDate' },
  date_range: { iconType: 'tokenDate' },
  geo_point: { iconType: 'tokenGeo' },
  geo_shape: { iconType: 'tokenGeo' },
  ip: { iconType: 'tokenIP' },
  ip_range: { iconType: 'tokenIP' },
  // is a plugin's data type https://www.elastic.co/guide/en/elasticsearch/plugins/current/mapper-murmur3-usage.html
  murmur3: { iconType: 'tokenFile' },
  number: { iconType: 'tokenNumber', color: 'euiColorVis0' },
  number_range: { iconType: 'tokenNumber', color: 'euiColorVis0' },
  histogram: { iconType: 'tokenHistogram', color: 'euiColorVis0' },
  _source: { iconType: 'editorCodeBlock', color: 'gray' },
  string: { iconType: 'tokenString' },
  text: { iconType: 'tokenString', color: 'euiColorVis1' },
  keyword: { iconType: 'tokenText', color: 'euiColorVis1' },
  nested: { iconType: 'tokenNested' },
};

export const FieldTypeIcon: FC<FieldTypeIconProps> = ({
  tooltipEnabled = false,
  type,
  needsAria = true,
}) => {
  const ariaLabel = getJobTypeAriaLabel(type);
  const token = typeToEuiIconMap[type] || defaultIcon;
  const containerProps = { ...token, ariaLabel, needsAria };

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
        <EuiToken iconType={iconType} color={color} shape="square" size="s" {...rest} />
      </span>
    </span>
  );
};
