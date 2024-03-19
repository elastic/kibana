/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';

export const ParamsText = ({ text }: { text: string }) => {
  const [isViewing, setIsViewing] = useState(false);

  return (
    <EuiFlexGroup gutterSize="s" justifyContent="flexStart">
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          data-test-subj="syntheticsParamsTextButton"
          iconType={!isViewing ? 'eye' : 'eyeClosed'}
          aria-label={i18n.translate('xpack.synthetics.settingsRoute.viewParam', {
            defaultMessage: 'View parameter value',
          })}
          onClick={() => setIsViewing((prevState) => !prevState)}
          disabled={!text}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size={isViewing ? 's' : 'm'}> {isViewing ? text : '•'.repeat(10)}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
