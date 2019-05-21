/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiBetaBadge,
  EuiPage,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { Wizard } from './wizard';

export const Page: SFC = () => (
  <EuiPage>
    <EuiPageBody>
      <EuiPageContentHeader>
        <EuiPageContentHeaderSection>
          <EuiTitle>
            <h1>
              <FormattedMessage
                id="xpack.ml.dataframe.transformsWizard.newDataFrameTitle"
                defaultMessage="New data frame"
              />
              <span>&nbsp;</span>
              <EuiBetaBadge
                label={i18n.translate('xpack.ml.dataframe.transformsWizard.betaBadgeLabel', {
                  defaultMessage: `Beta`,
                })}
                tooltipContent={i18n.translate(
                  'xpack.ml.dataframe.transformsWizard.betaBadgeTooltipContent',
                  {
                    defaultMessage: `Data frames are a beta feature. We'd love to hear your feedback.`,
                  }
                )}
              />
            </h1>
          </EuiTitle>
        </EuiPageContentHeaderSection>
      </EuiPageContentHeader>
      <EuiPageContentBody>
        <EuiSpacer size="l" />
        <Wizard />
      </EuiPageContentBody>
    </EuiPageBody>
  </EuiPage>
);
