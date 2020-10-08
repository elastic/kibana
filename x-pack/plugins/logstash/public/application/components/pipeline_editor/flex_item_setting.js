/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { FormLabelWithIconTip } from './form_label_with_icon_tip';

export function FlexItemSetting(props) {
  const { formRowLabelText, formRowTooltipText } = props;

  const label =
    formRowLabelText && formRowTooltipText ? (
      <FormLabelWithIconTip
        formRowLabelText={formRowLabelText}
        formRowTooltipText={formRowTooltipText}
      />
    ) : null;

  return (
    <EuiFlexItem grow={false}>
      <EuiFormRow label={label} hasEmptyLabelSpace={!label}>
        {props.children}
      </EuiFormRow>
    </EuiFlexItem>
  );
}

FlexItemSetting.propTypes = {
  formRowLabelText: PropTypes.string,
  formRowTooltipText: PropTypes.string,
};
