/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';
import { getJobTypeLabel } from '../../util/field_types_utils';
import type { JobFieldType } from '../../../../../common/types';
import './_index.scss';

interface FieldTypeIconProps {
  tooltipEnabled: boolean;
  type: JobFieldType;
}

export const FieldTypeIcon: FC<FieldTypeIconProps> = ({ tooltipEnabled = false, type }) => {
  const label =
    getJobTypeLabel(type) ??
    i18n.translate('xpack.dataVisualizer.fieldTypeIcon.fieldTypeTooltip', {
      defaultMessage: '{type} type',
      values: { type },
    });
  if (tooltipEnabled === true) {
    return (
      <EuiToolTip position="left" content={label} anchorClassName="dvFieldTypeIcon__anchor">
        <FieldIcon type={type} />
      </EuiToolTip>
    );
  }

  return <FieldIcon type={type} label={label} />;
};
