/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FunctionComponent } from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';

import { documentationLinksService } from '../../../../services/documentation';

const i18nTexts = {
  callout: {
    title: (count: number) =>
      i18n.translate('xpack.snapshotRestore.restoreForm.dataStreamsWarningCallOut.title', {
        defaultMessage: 'Data {count, plural, one {stream} other {streams}} found in this snapshot',
        values: { count },
      }),
    body: () => (
      <FormattedMessage
        id="xpack.snapshotRestore.restoreForm.dataStreamsWarningCallOut.body"
        defaultMessage="Please ensure any restored data stream has a capturing composable index template or include global state in this restore. Restoring global state will also restore required index templates but may overwrite existing index templates. {learnMoreLink} about data streams and index templates."
        values={{
          learnMoreLink: (
            <EuiLink
              target="_blank"
              href={documentationLinksService.getCreateIndexTemplateForDataStream()}
            >
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
  return (
    <EuiCallOut title={i18nTexts.callout.title(dataStreamsCount)} iconType="alert" color="warning">
      {i18nTexts.callout.body()}
    </EuiCallOut>
  );
};
