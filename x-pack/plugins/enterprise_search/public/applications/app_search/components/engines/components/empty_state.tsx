/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useActions } from 'kea';
import { EuiPageContent, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiButtonTo } from '../../../../shared/react_router_helpers';
import { TelemetryLogic } from '../../../../shared/telemetry';
import { SetAppSearchChrome as SetPageChrome } from '../../../../shared/kibana_chrome';
import { ENGINE_CREATION_PATH } from '../../../routes';

import { EnginesOverviewHeader } from './header';

import './empty_state.scss';

export const EmptyState: React.FC = () => {
  const { sendAppSearchTelemetry } = useActions(TelemetryLogic);

  return (
    <>
      <SetPageChrome />
      <EnginesOverviewHeader />
      <EuiPageContent className="emptyState">
        <EuiEmptyPrompt
          className="emptyState__prompt"
          iconType="eyeClosed"
          title={
            <h2>
              <FormattedMessage
                id="xpack.enterpriseSearch.appSearch.emptyState.title"
                defaultMessage="Create your first engine"
              />
            </h2>
          }
          titleSize="l"
          body={
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.appSearch.emptyState.description1"
                defaultMessage="An App Search engine stores the documents for your search experience."
              />
            </p>
          }
          actions={
            <EuiButtonTo
              data-test-subj="EmptyStateCreateFirstEngineCta"
              iconType="popout"
              fill
              to={ENGINE_CREATION_PATH}
              onClick={() =>
                sendAppSearchTelemetry({
                  action: 'clicked',
                  metric: 'create_first_engine_button',
                })
              }
            >
              <FormattedMessage
                id="xpack.enterpriseSearch.appSearch.emptyState.createFirstEngineCta"
                defaultMessage="Create an engine"
              />
            </EuiButtonTo>
          }
        />
      </EuiPageContent>
    </>
  );
};
