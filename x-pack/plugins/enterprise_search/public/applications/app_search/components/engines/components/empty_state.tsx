/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiPageContent, EuiEmptyPrompt, EuiSpacer, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { getAppSearchUrl } from '../../../../shared/enterprise_search_url';
import { TelemetryLogic } from '../../../../shared/telemetry';
import { AppLogic } from '../../../app_logic';

import { EnginesOverviewHeader } from './header';

import './empty_state.scss';

export const EmptyState: React.FC = () => {
  const {
    myRole: { canManageEngines },
  } = useValues(AppLogic);
  const { sendAppSearchTelemetry } = useActions(TelemetryLogic);

  return (
    <>
      <EnginesOverviewHeader />
      <EuiPageContent hasBorder className="emptyState">
        {canManageEngines ? (
          <EuiEmptyPrompt
            data-test-subj="AdminEmptyEnginesPrompt"
            className="emptyState__prompt"
            iconType="eyeClosed"
            title={
              <h2>
                {i18n.translate('xpack.enterpriseSearch.appSearch.emptyState.title', {
                  defaultMessage: 'Create your first engine',
                })}
              </h2>
            }
            titleSize="l"
            body={
              <p>
                {i18n.translate('xpack.enterpriseSearch.appSearch.emptyState.description1', {
                  defaultMessage:
                    'An App Search engine stores the documents for your search experience.',
                })}
              </p>
            }
            actions={
              <>
                {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
                <EuiButton
                  data-test-subj="EmptyStateCreateFirstEngineCta"
                  fill
                  href={getAppSearchUrl('/engines/new')}
                  target="_blank"
                  iconType="popout"
                  onClick={() =>
                    sendAppSearchTelemetry({
                      action: 'clicked',
                      metric: 'create_first_engine_button',
                    })
                  }
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.appSearch.emptyState.createFirstEngineCta',
                    { defaultMessage: 'Create an engine' }
                  )}
                </EuiButton>
                <EuiSpacer size="xl" />
              </>
            }
          />
        ) : (
          <EuiEmptyPrompt
            data-test-subj="NonAdminEmptyEnginesPrompt"
            className="emptyState__prompt"
            iconType="eyeClosed"
            title={
              <h2>
                {i18n.translate('xpack.enterpriseSearch.appSearch.emptyState.nonAdmin.title', {
                  defaultMessage: 'No engines available',
                })}
              </h2>
            }
            body={
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.emptyState.nonAdmin.description',
                  {
                    defaultMessage:
                      'Contact your App Search administrator to either create or grant you access to an engine.',
                  }
                )}
              </p>
            }
          />
        )}
      </EuiPageContent>
    </>
  );
};
