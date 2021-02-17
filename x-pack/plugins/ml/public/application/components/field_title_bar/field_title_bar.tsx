/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { EuiText, EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FieldTypeIcon } from '../field_type_icon';
import { getMLJobTypeAriaLabel } from '../../util/field_types_utils';
import {
  FieldVisConfig,
  FileBasedFieldVisConfig,
  isIndexBasedFieldVisConfig,
} from '../../datavisualizer/stats_table/types/field_vis_config';

interface Props {
  card: FieldVisConfig | FileBasedFieldVisConfig;
}

export const FieldTitleBar: FC<Props> = ({ card }) => {
  const fieldName =
    card.fieldName ||
    i18n.translate('xpack.ml.fieldTitleBar.documentCountLabel', {
      defaultMessage: 'document count',
    });
  const cardTitleAriaLabel = [fieldName];

  const classNames = ['ml-field-title-bar'];

  if (card.fieldName === undefined) {
    classNames.push('document_count');
  } else if (isIndexBasedFieldVisConfig(card) && card.isUnsupportedType === true) {
    classNames.push('type-other');
  } else {
    classNames.push(card.type);
  }

  if (isIndexBasedFieldVisConfig(card) && card.isUnsupportedType !== true) {
    // All the supported field types have aria labels.
    cardTitleAriaLabel.unshift(getMLJobTypeAriaLabel(card.type)!);
  }

  return (
    <EuiText className={classNames.join(' ')}>
      <FieldTypeIcon
        type={card.type}
        fieldName={card.fieldName}
        tooltipEnabled={true}
        needsAria={false}
      />
      <EuiToolTip position="left" content={fieldName}>
        <div className="field-name" tabIndex={0} aria-label={`${cardTitleAriaLabel.join(', ')}`}>
          {fieldName}
        </div>
      </EuiToolTip>
    </EuiText>
  );
};
