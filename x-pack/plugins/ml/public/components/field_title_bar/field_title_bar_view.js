/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { EuiText, EuiToolTip } from '@elastic/eui';

import { FieldTypeIcon } from '../field_type_icon';

export function FieldTitleBar({ card }) {
  const classNames = ['ml-field-title-bar'];
  if (card.fieldName === undefined) {
    classNames.push('document_count');
  } else if (card.isUnsupportedType === true) {
    classNames.push('type-other');
  } else {
    classNames.push(card.type);
  }

  const fieldName = card.fieldName || 'document count';

  return (
    <EuiText className={classNames.join(' ')}>
      <FieldTypeIcon type={card.type} tooltipEnabled={true} />
      <EuiToolTip position="left" content={fieldName}>
        <div className="field-name">
          {fieldName}
        </div>
      </EuiToolTip>
    </EuiText>
  );
}
FieldTitleBar.propTypes = {
  card: PropTypes.object.isRequired
};
