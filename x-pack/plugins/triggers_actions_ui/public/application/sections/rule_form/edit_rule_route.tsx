/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleForm } from '@kbn/alerts-ui-shared/src/rule_form/rule_form';
import { getRuleDetailsRoute } from '@kbn/rule-data-utils';
import { useLocation } from 'react-router-dom';
import { useKibana } from '../../../common/lib/kibana';

export const EditRuleRoute = () => {
  const {
    http,
    i18n,
    theme,
    application,
    notifications,
    charts,
    settings,
    data,
    dataViews,
    unifiedSearch,
    docLinks,
    ruleTypeRegistry,
    actionTypeRegistry,
  } = useKibana().services;

  const { state } = useLocation<{ returnApp?: string; returnPath?: string }>();
  const { returnApp, returnPath } = state || {};

  return (
    <IntlProvider locale="en">
      <RuleForm
        plugins={{
          http,
          i18n,
          theme,
          application,
          notifications,
          charts,
          settings,
          data,
          dataViews,
          unifiedSearch,
          docLinks,
          ruleTypeRegistry,
          actionTypeRegistry,
        }}
        onCancel={() => {
          if (returnApp && returnPath) {
            application.navigateToApp(returnApp, { path: returnPath });
          } else {
            application.navigateToApp('management', {
              path: `insightsAndAlerting/triggersActions/rules`,
            });
          }
        }}
        onSubmit={(id) => {
          application.navigateToApp('management', {
            path: `insightsAndAlerting/triggersActions/${getRuleDetailsRoute(id)}`,
          });
        }}
      />
    </IntlProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export { EditRuleRoute as default };
