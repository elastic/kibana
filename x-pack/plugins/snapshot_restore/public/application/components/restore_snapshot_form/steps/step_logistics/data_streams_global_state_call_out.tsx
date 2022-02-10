/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FunctionComponent } from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { useCore } from '../../../../app_context';

const i18nTexts = {
  callout: {
    title: (count: number) =>
      i18n.translate('xpack.snapshotRestore.restoreForm.dataStreamsWarningCallOut.title', {
        defaultMessage:
          'This snapshot contains {count, plural, one {a data stream} other {data streams}}',
        values: { count },
      }),
    body: (docLink: string) => (
      <FormattedMessage
        id="xpack.snapshotRestore.restoreForm.dataStreamsWarningCallOut.body"
        defaultMessage="Each data stream requires a matching index template. Please ensure any restored data streams have a matching index template. You can restore index templates by restoring the global cluster state. However, this may overwrite existing templates, cluster settings, ingest pipelines, and lifecycle policies. {learnMoreLink} about restoring snapshots that contain data streams."
        values={{
          learnMoreLink: (
            <EuiLink target="_blank" href={docLink}>
              {i18n.translate(
                'xpack.snapshotRestore.restoreForm.dataStreamsWarningCallOut.body.learnMoreLink',
                { defaultMessage: 'Learn more' }
              )}
            </EuiLink>
          ),
        }}
      />
    ),
  },
};

interface Props {
  dataStreamsCount: number;
}

export const DataStreamsGlobalStateCallOut: FunctionComponent<Props> = ({ dataStreamsCount }) => {
  const { docLinks } = useCore();
  return (
    <EuiCallOut
      data-test-subj="dataStreamWarningCallOut"
      title={i18nTexts.callout.title(dataStreamsCount)}
      iconType="alert"
      color="warning"
    >
      {i18nTexts.callout.body(docLinks.links.snapshotRestore.createSnapshot)}
    </EuiCallOut>
  );
};
