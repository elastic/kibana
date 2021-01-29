/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { Switch, Route } from 'react-router-dom';

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';

import { PLUGIN_NAME } from '../../common';
import { LiveQuery } from '../live_query';

export const OsqueryAppComponent = () => {
  return (
    <EuiPage restrictWidth="1000px">
      <EuiPageBody>
        <EuiPageHeader>
          <EuiTitle size="l">
            <h1>
              <FormattedMessage
                id="xpack.osquery.helloWorldText"
                defaultMessage="{name}"
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                values={{ name: PLUGIN_NAME }}
              />
            </h1>
          </EuiTitle>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentBody>
            <EuiSpacer />

            <Switch>
              <Route path={`/live_query`}>
                <LiveQuery />
              </Route>
            </Switch>

            <EuiSpacer />
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

export const OsqueryApp = React.memo(OsqueryAppComponent);
