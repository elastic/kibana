/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiText, EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FieldTypeIcon } from '../field_type_icon';
import { FieldVisConfig } from '../../datavisualizer/index_based/common';
import { getMLJobTypeAriaLabel } from '../../util/field_types_utils';

interface Props {
  card: FieldVisConfig;
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
  } else if (card.isUnsupportedType === true) {
    classNames.push('type-other');
  } else {
    classNames.push(card.type);
  }

  if (card.isUnsupportedType !== true) {
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
