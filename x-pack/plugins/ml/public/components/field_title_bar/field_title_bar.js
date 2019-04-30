/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { EuiText, EuiToolTip } from '@elastic/eui';

import { FieldTypeIcon } from '../field_type_icon';
import { getMLJobTypeAriaLabel } from '../../util/field_types_utils';
import { i18n } from '@kbn/i18n';

export function FieldTitleBar({ card }) {
  // don't render and fail gracefully if card prop isn't set
  if (typeof card !== 'object' || card === null) {
    return null;
  }

  const fieldName = card.fieldName || i18n.translate('xpack.ml.fieldTitleBar.documentCountLabel', {
    defaultMessage: 'document count'
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
    cardTitleAriaLabel.unshift(
      getMLJobTypeAriaLabel(card.type)
    );
  }

  return (
    <EuiText className={classNames.join(' ')}>
      <FieldTypeIcon type={card.type} tooltipEnabled={true} needsAria={false} />
      <EuiToolTip position="left" content={fieldName}>
        <div
          className="field-name"
          tabIndex="0"
          aria-label={`${cardTitleAriaLabel.join(', ')}`}
        >
          {fieldName}
        </div>
      </EuiToolTip>
    </EuiText>
  );
}
FieldTitleBar.propTypes = {
  card: PropTypes.object.isRequired
};
