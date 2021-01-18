/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiButton, EuiFlexGroup, EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';

interface Props {
  onClick(): void;
}

export const CustomizationCallout: React.FC<Props> = ({ onClick }) => {
  return (
    <EuiFlexGroup
      direction="column"
      className="customizationCallout"
      alignItems="center"
      gutterSize="none"
    >
      <EuiIcon type="iInCircle" color="primary" size="xxl" />
      <EuiSpacer />
      <EuiText size="s" textAlign="center">
        <strong>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.documents.search.customizationCallout.message',
            {
              defaultMessage:
                'Did you know that you can customize your document search experience? Click "Customize" below to get started.',
            }
          )}
        </strong>
      </EuiText>
      <EuiSpacer />
      <EuiButton fill color="primary" iconType="gear" onClick={onClick}>
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.documents.search.customizationCallout.button',
          {
            defaultMessage: 'Customize',
          }
        )}
      </EuiButton>
    </EuiFlexGroup>
  );
};
