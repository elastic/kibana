/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiIcon, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const i18nTexts = {
  noDeprecationsText: i18n.translate('xpack.upgradeAssistant.noDeprecationsText', {
    defaultMessage: 'No warnings. Good to go!',
  }),
};

export const NoDeprecations: FunctionComponent = () => {
  return (
    <>
      <EuiSpacer size="xl" />
      <EuiText color="success">
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="check" />
          </EuiFlexItem>
          <EuiFlexItem grow={false} data-test-subj="noDeprecationsLabel">
            {i18nTexts.noDeprecationsText}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiText>
    </>
  );
};
