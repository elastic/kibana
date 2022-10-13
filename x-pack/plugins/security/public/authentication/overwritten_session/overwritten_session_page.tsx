/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

import type { AppMountParameters, CoreStart, IBasePath } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import { parseNext } from '../../../common/parse_next';
import type { AuthenticationServiceSetup } from '../authentication_service';
import { AuthenticationStatePage } from '../components';

interface Props {
  basePath: IBasePath;
  authc: Pick<AuthenticationServiceSetup, 'getCurrentUser'>;
}

export function OverwrittenSessionPage({ authc, basePath }: Props) {
  const [username, setUsername] = useState<string | null>(null);
  useEffect(() => {
    authc.getCurrentUser().then((user) => setUsername(user.username));
  }, [authc]);

  if (username == null) {
    return null;
  }

  return (
    <AuthenticationStatePage
      title={
        <FormattedMessage
          id="xpack.security.overwrittenSession.title"
          defaultMessage="You previously logged in as a different user."
        />
      }
    >
      <EuiButton href={parseNext(window.location.href, basePath.serverBasePath)}>
        <FormattedMessage
          id="xpack.security.overwrittenSession.continueAsUserText"
          defaultMessage="Continue as {username}"
          values={{ username }}
        />
      </EuiButton>
    </AuthenticationStatePage>
  );
}

export function renderOverwrittenSessionPage(
  i18nStart: CoreStart['i18n'],
  { element, theme$ }: Pick<AppMountParameters, 'element' | 'theme$'>,
  props: Props
) {
  ReactDOM.render(
    <i18nStart.Context>
      <KibanaThemeProvider theme$={theme$}>
        <OverwrittenSessionPage {...props} />
      </KibanaThemeProvider>
    </i18nStart.Context>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
}
