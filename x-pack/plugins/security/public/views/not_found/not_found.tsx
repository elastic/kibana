/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { AuthenticationStatePage } from 'plugins/security/components/authentication_state_page';
// @ts-ignore
import template from 'plugins/security/views/not_found/not_found.html';
import React from 'react';
import { render } from 'react-dom';
import 'ui/autoload/styles';
import chrome from 'ui/chrome';
import { I18nContext } from 'ui/i18n';

chrome
  .setVisible(false)
  .setRootTemplate(template)
  .setRootController('logout', ($scope: any, canAccessKibana: boolean) => {
    $scope.$$postDigest(() => {
      const domNode = document.getElementById('reactNotFoundRoot');
      const { title, message, help } = getMessaging(canAccessKibana);

      render(
        <I18nContext>
          <AuthenticationStatePage title={title}>
            <EuiText>
              <p>{message}</p>
              <p>{help}</p>
            </EuiText>

            <EuiSpacer />

            <EuiFlexGroup justifyContent={'center'}>
              {canAccessKibana && (
                <EuiFlexItem grow={false}>
                  <EuiButton href={chrome.getBasePath()}>
                    <FormattedMessage
                      id="xpack.security.notFound.goHome"
                      defaultMessage="Kibana home"
                    />
                  </EuiButton>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiButton href={chrome.addBasePath('/logout')}>
                  <FormattedMessage id="xpack.security.notFound.logout" defaultMessage="Logout" />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </AuthenticationStatePage>
        </I18nContext>,
        domNode
      );
    });
  });

function getMessaging(canAccessKibana: boolean) {
  if (canAccessKibana) {
    return {
      title: <FormattedMessage id="xpack.security.notFound.title" defaultMessage="Not found" />,
      message: (
        <FormattedMessage
          id="xpack.security.notFound.notFoundMessage"
          defaultMessage="Sorry, the requested resource was not found."
        />
      ),
      help: (
        <FormattedMessage
          id="xpack.security.notFound.helpMessage"
          defaultMessage="It might be missing, or you might not have access. Contact your administrator for assistance."
        />
      ),
    };
  }

  return {
    title: (
      <FormattedMessage
        id="xpack.security.unauthorized.title"
        defaultMessage="No access to Kibana"
      />
    ),
    message: (
      <FormattedMessage
        id="xpack.security.unauthorized.notFoundMessage"
        defaultMessage="Your account does not have access to Kibana."
      />
    ),
    help: (
      <FormattedMessage
        id="xpack.security.unauthorized.helpMessage"
        defaultMessage="Contact your administrator for assistance."
      />
    ),
  };
}
