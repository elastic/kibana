/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './_index.scss';

import React, { FormEvent, MouseEvent, useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { CoreStart, FatalErrorsStart, HttpStart, NotificationsStart } from 'src/core/public';

import { parseNext } from '../../../common/parse_next';
import { AuthenticationStatePage } from '../components';

interface Props {
  http: HttpStart;
  notifications: NotificationsStart;
  fatalErrors: FatalErrorsStart;
}

export function AccessNoticePage({ http, fatalErrors, notifications }: Props) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [accessNotice, setAccessNotice] = useState<string | null>(null);
  useEffect(() => {
    http
      .get<{ accessNotice: string }>('/internal/security/access_notice/state')
      .then(response => setAccessNotice(response.accessNotice))
      .catch(err => fatalErrors.add(err));
  }, [http, fatalErrors]);

  const onAcknowledge = useCallback(
    async (e: MouseEvent<HTMLButtonElement> | FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      try {
        setIsLoading(true);
        await http.post('/internal/security/access_notice/acknowledge');
        window.location.href = parseNext(window.location.href, http.basePath.serverBasePath);
      } catch (err) {
        notifications.toasts.addError(err, {
          title: i18n.translate('xpack.security.accessNotice.acknowledgeErrorMessage', {
            defaultMessage: 'Could not acknowledge access notice.',
          }),
        });

        setIsLoading(false);
      }
    },
    [http, notifications]
  );

  if (accessNotice == null) {
    return null;
  }

  return (
    <AuthenticationStatePage
      className="secAccessNoticePage"
      title={
        <FormattedMessage id="xpack.security.accessNotice.title" defaultMessage="Access Notice" />
      }
    >
      <form onSubmit={onAcknowledge}>
        <EuiPanel>
          <EuiFlexGroup justifyContent="spaceBetween" direction="column">
            <EuiFlexItem className="secAccessNoticePage__text">
              <EuiText textAlign="left">
                <ReactMarkdown>{accessNotice}</ReactMarkdown>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem className="secAccessNoticePage__acknowledge">
              <EuiSpacer size="s" />
              <EuiButton
                fill
                type="submit"
                color="primary"
                onClick={onAcknowledge}
                isDisabled={isLoading}
                isLoading={isLoading}
                data-test-subj="accessNoticeAcknowledge"
              >
                <FormattedMessage
                  id="xpack.security.accessNotice.acknowledgeButtonText"
                  defaultMessage="Acknowledge and continue"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <EuiSpacer size="xxl" />
      </form>
    </AuthenticationStatePage>
  );
}

export function renderAccessNoticePage(
  i18nStart: CoreStart['i18n'],
  element: Element,
  props: Props
) {
  ReactDOM.render(
    <i18nStart.Context>
      <AccessNoticePage {...props} />
    </i18nStart.Context>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
}
