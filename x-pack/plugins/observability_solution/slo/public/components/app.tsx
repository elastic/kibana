/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { BrowserRouter as Router } from '@kbn/shared-ux-router';
import { EuiButton, EuiHorizontalRule, EuiPageTemplate, EuiTitle, EuiText } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';

import { PLUGIN_NAME } from '../../common';

interface SlosAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
}

export function SlosApp({ basename, notifications, http }: SlosAppDeps) {
  // Use React hooks to manage state.
  const [timestamp, setTimestamp] = useState<string | undefined>();

  const onClickHandler = () => {
    // Use the core http service to make a response to the server API.
    http.get('/api/slos/example').then((res) => {
      setTimestamp(res.time);
      // Use the core notifications service to display a success message.
      notifications.toasts.addSuccess(
        i18n.translate('xpack.slos.onClickHandler.', { defaultMessage: '' })
      );
    });
  };

  return (
    <Router basename={basename}>
      <I18nProvider>
        <EuiPageTemplate restrictWidth="1000px">
          <EuiPageTemplate.Header>
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id="slos.helloWorldText"
                  defaultMessage="{name}"
                  values={{ name: PLUGIN_NAME }}
                />
              </h1>
            </EuiTitle>
          </EuiPageTemplate.Header>
          <EuiPageTemplate.Section>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="slos.congratulationsTitle"
                  defaultMessage="Congratulations, you have successfully created a new Kibana Plugin!"
                />
              </h2>
            </EuiTitle>
            <EuiText>
              <p>
                <FormattedMessage
                  id="slos.content"
                  defaultMessage="Look through the generated code and check out the plugin development documentation."
                />
              </p>
              <EuiHorizontalRule />
              <p>
                <FormattedMessage
                  id="slos.timestampText"
                  defaultMessage="Last timestamp: {time}"
                  values={{ time: timestamp ? timestamp : 'Unknown' }}
                />
              </p>
              <EuiButton
                data-test-subj="observabilitySolutionSlosAppGetDataButton"
                type="primary"
                size="s"
                onClick={onClickHandler}
              >
                <FormattedMessage id="slos.buttonText" defaultMessage="Get data" />
              </EuiButton>
            </EuiText>
          </EuiPageTemplate.Section>
        </EuiPageTemplate>
      </I18nProvider>
    </Router>
  );
}
