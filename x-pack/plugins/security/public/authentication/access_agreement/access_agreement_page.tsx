/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './access_agreement_page.scss';

import React, { FormEvent, MouseEvent, useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import {
  EuiButton,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
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

export function AccessAgreementPage({ http, fatalErrors, notifications }: Props) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [accessAgreement, setAccessAgreement] = useState<string | null>(null);
  useEffect(() => {
    http
      .get<{ accessAgreement: string }>('/internal/security/access_agreement/state')
      .then((response) => setAccessAgreement(response.accessAgreement))
      .catch((err) => fatalErrors.add(err));
  }, [http, fatalErrors]);

  const onAcknowledge = useCallback(
    async (e: MouseEvent<HTMLButtonElement> | FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      try {
        setIsLoading(true);
        await http.post('/internal/security/access_agreement/acknowledge');
        window.location.href = parseNext(window.location.href, http.basePath.serverBasePath);
      } catch (err) {
        notifications.toasts.addError(err, {
          title: i18n.translate('xpack.security.accessAgreement.acknowledgeErrorMessage', {
            defaultMessage: 'Could not acknowledge access agreement.',
          }),
        });

        setIsLoading(false);
      }
    },
    [http, notifications]
  );

  const content = accessAgreement ? (
    <form onSubmit={onAcknowledge}>
      <EuiPanel paddingSize="none">
        <EuiFlexGroup gutterSize="none" direction="column">
          <EuiFlexItem className="secAccessAgreementPage__textWrapper">
            <div className="secAccessAgreementPage__text">
              <EuiText textAlign="left">
                <ReactMarkdown>{accessAgreement}</ReactMarkdown>
              </EuiText>
            </div>
          </EuiFlexItem>
          <EuiFlexItem className="secAccessAgreementPage__footer">
            <div className="secAccessAgreementPage__footerInner">
              <EuiButton
                fill
                type="submit"
                color="primary"
                onClick={onAcknowledge}
                isDisabled={isLoading}
                isLoading={isLoading}
                data-test-subj="accessAgreementAcknowledge"
              >
                <FormattedMessage
                  id="xpack.security.accessAgreement.acknowledgeButtonText"
                  defaultMessage="Acknowledge and continue"
                />
              </EuiButton>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </form>
  ) : (
    <EuiPanel paddingSize="l">
      <EuiLoadingContent lines={10} />
    </EuiPanel>
  );

  return (
    <AuthenticationStatePage
      className="secAccessAgreementPage"
      title={
        <FormattedMessage
          id="xpack.security.accessAgreement.title"
          defaultMessage="Access Agreement"
        />
      }
    >
      {content}
      <EuiSpacer size="xxl" />
    </AuthenticationStatePage>
  );
}

export function renderAccessAgreementPage(
  i18nStart: CoreStart['i18n'],
  element: Element,
  props: Props
) {
  ReactDOM.render(
    <i18nStart.Context>
      <AccessAgreementPage {...props} />
    </i18nStart.Context>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
}
