/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions } from 'kea';

import {
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';

import { RELEVANCE_TUNING_TITLE } from './constants';
import { RelevanceTuningForm } from './relevance_tuning_form';
import { RelevanceTuningLogic } from './relevance_tuning_logic';

interface Props {
  engineBreadcrumb: string[];
}

export const RelevanceTuning: React.FC<Props> = ({ engineBreadcrumb }) => {
  const { initializeRelevanceTuning } = useActions(RelevanceTuningLogic);

  useEffect(() => {
    initializeRelevanceTuning();
  }, []);

  return (
    <>
      <SetPageChrome trail={[...engineBreadcrumb, RELEVANCE_TUNING_TITLE]} />
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>{RELEVANCE_TUNING_TITLE}</h1>
          </EuiTitle>
          <EuiText>
            <EuiTextColor color="subdued">
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.description',
                {
                  defaultMessage: 'Set field weights and boosts',
                }
              )}
            </EuiTextColor>
          </EuiText>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiSpacer />
      <FlashMessages />
      <EuiFlexGroup>
        <EuiFlexItem>
          <RelevanceTuningForm />
        </EuiFlexItem>
        <EuiFlexItem />
      </EuiFlexGroup>
    </>
  );
};
