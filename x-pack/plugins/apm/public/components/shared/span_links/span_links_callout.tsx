/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLocalStorage } from '../../../hooks/use_local_storage';

export function SpanLinksCallout() {
  const [spanLinksCalloutDismissed, setSpanLinksCalloutDismissed] =
    useLocalStorage('apm.spanLinksCalloutDismissed', false);

  if (spanLinksCalloutDismissed) {
    return null;
  }

  return (
    <EuiCallOut
      title={i18n.translate('xpack.apm.spanLinks.callout.title', {
        defaultMessage: 'Span links',
      })}
      iconType="iInCircle"
    >
      <p>
        <FormattedMessage
          id="xpack.apm.spanLinks.callout.description"
          defaultMessage="A Link is a pointer from the current span to another span in the same trace or in a different trace. For example. this can be used in batching operations, where a single batch handler processes multiple requests from different traces or when the handler receives a request from a different project. Learn more in the {docsLink}."
          // TODO: caue: check doc link
          values={{
            docsLink: i18n.translate(
              'xpack.apm.spanLinks.callout.description.link.doc',
              {
                defaultMessage: 'docs',
              }
            ),
          }}
        />
      </p>
      <EuiButton
        onClick={() => {
          setSpanLinksCalloutDismissed(true);
        }}
      >
        {i18n.translate('xpack.apm.spanLinks.callout.dimissButton', {
          defaultMessage: 'Dismiss',
        })}
      </EuiButton>
    </EuiCallOut>
  );
}
